import { Router } from 'express';
import { getDb, nowIso } from '../db.js';
import { HttpError, conflict, forbidden, notFound } from '../errors.js';
import { idParam, validate, nameRule, phoneRule, REGIONS } from '../validate.js';
import { requireUser } from '../auth.js';
import { imageUrls } from '../images.js';
import { allowedMoves, changeStatus } from '../lifecycle.js';
import { productCard } from './catalog.js';

const router = Router();
router.use('/orders', requireUser);

const addressRules = {
  recipient: nameRule,
  phone: phoneRule,
  region: { type: 'string', required: true, oneOf: REGIONS },
  city: { type: 'string', required: true, min: 2, max: 80 },
  street: { type: 'string', required: true, min: 2, max: 120 },   // street and building
  apartment: { type: 'string', max: 30, default: '' },
  note: { type: 'string', max: 500, default: '' },
};

const findOrderByKey = (db, key) => db.prepare('SELECT id, buyer_id, total_amd FROM orders WHERE request_key = ?').get(key);

/**
 * POST /orders — checkout. Plain SQL in one BEGIN IMMEDIATE transaction:
 *  1. load the cart with current product data
 *  2. stop if any price changed since it went into the cart (409 PRICE_CHANGED)
 *  3. create the order (address copied in) and one seller order per seller
 *  4. copy title + unit price into order_items
 *  5. reduce stock with a guarded UPDATE and check the changed-row count;
 *     if any line fails, throwing rolls back the WHOLE order (409 with the product name)
 *  6. empty the cart
 * The request key is UNIQUE, so a repeated submit returns the existing order.
 */
router.post('/orders', (req, res) => {
  const { requestKey } = validate(req.body, {
    requestKey: { type: 'string', required: true, min: 16, max: 100, pattern: /^[A-Za-z0-9_-]+$/ },
  });
  const addr = validate(req.body, addressRules);
  const db = getDb();
  const buyerId = req.user.id;

  const replay = (existing) => {
    if (existing.buyer_id !== buyerId) throw conflict('REQUEST_KEY_USED', 'This request key was already used');
    return res.status(200).json({ order: { id: existing.id, totalAmd: existing.total_amd }, duplicate: true });
  };

  const before = findOrderByKey(db, requestKey);
  if (before) return replay(before);

  let result;
  try {
    result = db.transaction(() => {
      const again = findOrderByKey(db, requestKey);
      if (again) return { existing: again };

      const lines = db
        .prepare(
          `SELECT ci.product_id, ci.quantity, ci.price_when_added,
                  p.title, p.price_amd, p.stock, p.is_published, p.seller_id
             FROM cart_items ci JOIN products p ON p.id = ci.product_id
            WHERE ci.user_id = ?
            ORDER BY p.seller_id, ci.product_id`,
        )
        .all(buyerId);
      if (lines.length === 0) throw new HttpError(400, 'CART_EMPTY', 'Your cart is empty');

      for (const l of lines) {
        if (l.seller_id === buyerId) throw forbidden(`You cannot buy your own product "${l.title}"`);
        if (!l.is_published) {
          throw conflict('PRODUCT_UNAVAILABLE', `"${l.title}" is no longer available`, { productId: l.product_id });
        }
      }

      const changed = lines.filter((l) => l.price_amd !== l.price_when_added);
      if (changed.length) {
        throw conflict(
          'PRICE_CHANGED',
          changed.map((l) => `The price of "${l.title}" changed from ${l.price_when_added} to ${l.price_amd} AMD`).join('. '),
          { items: changed.map((l) => ({ productId: l.product_id, title: l.title, oldPrice: l.price_when_added, newPrice: l.price_amd })) },
        );
      }

      const now = nowIso();
      const total = lines.reduce((s, l) => s + l.price_amd * l.quantity, 0);
      const orderId = db
        .prepare(
          `INSERT INTO orders (buyer_id, recipient, phone, region, city, street, apartment, note, total_amd, request_key, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(buyerId, addr.recipient, addr.phone, addr.region, addr.city, addr.street, addr.apartment, addr.note, total, requestKey, now)
        .lastInsertRowid;

      const insertSellerOrder = db.prepare(
        `INSERT INTO seller_orders (order_id, seller_id, status, subtotal_amd, updated_at) VALUES (?, ?, 'placed', ?, ?)`,
      );
      const insertItem = db.prepare(
        `INSERT INTO order_items (seller_order_id, product_id, title, unit_price_amd, quantity) VALUES (?, ?, ?, ?, ?)`,
      );
      const insertHistory = db.prepare(
        `INSERT INTO status_history (seller_order_id, from_status, to_status, changed_by, created_at) VALUES (?, NULL, 'placed', ?, ?)`,
      );
      const takeStock = db.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ? AND stock >= ?',
      );

      const bySeller = new Map();
      for (const l of lines) {
        if (!bySeller.has(l.seller_id)) bySeller.set(l.seller_id, []);
        bySeller.get(l.seller_id).push(l);
      }

      for (const [sellerId, items] of bySeller) {
        const subtotal = items.reduce((s, l) => s + l.price_amd * l.quantity, 0);
        const soId = insertSellerOrder.run(orderId, sellerId, subtotal, now).lastInsertRowid;
        insertHistory.run(soId, buyerId, now);
        for (const l of items) {
          insertItem.run(soId, l.product_id, l.title, l.price_amd, l.quantity);
          if (takeStock.run(l.quantity, now, l.product_id, l.quantity).changes !== 1) {
            const left = db.prepare('SELECT stock FROM products WHERE id = ?').get(l.product_id).stock;
            throw conflict(
              'NOT_ENOUGH_STOCK',
              left === 0 ? `"${l.title}" is sold out` : `Only ${left} of "${l.title}" left`,
              { productId: l.product_id, title: l.title, stock: left },
            );
          }
        }
      }

      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(buyerId);
      return { order: { id: Number(orderId), totalAmd: total } };
    }).immediate();
  } catch (e) {
    // Two identical requests racing: the UNIQUE constraint on request_key rejects the second one.
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' && String(e.message).includes('request_key')) {
      return replay(findOrderByKey(db, requestKey));
    }
    throw e;
  }

  if (result.existing) return replay(result.existing);
  res.status(201).json({ order: result.order, duplicate: false });
});

// GET /orders/again — products this buyer ordered before that are still for sale ("Order again")
router.get('/orders/again', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT p.*, u.store_name,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1) AS main_image,
              MAX(o.id) AS last_order
         FROM orders o
         JOIN seller_orders so ON so.order_id = o.id
         JOIN order_items oi ON oi.seller_order_id = so.id
         JOIN products p ON p.id = oi.product_id
         JOIN users u ON u.id = p.seller_id
        WHERE o.buyer_id = ? AND p.is_published = 1 AND so.status != 'cancelled'
        GROUP BY p.id
        ORDER BY last_order DESC
        LIMIT 12`,
    )
    .all(req.user.id);
  res.json({ items: rows.map(productCard) });
});

// GET /orders — the signed-in buyer's orders, newest first
router.get('/orders', (req, res) => {
  const db = getDb();
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const size = 20;
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM orders WHERE buyer_id = ?').get(req.user.id);
  const orders = db
    .prepare('SELECT id, total_amd, created_at FROM orders WHERE buyer_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(req.user.id, size, (page - 1) * size);

  const partsStmt = db.prepare(
    `SELECT so.id, so.status, so.subtotal_amd, u.store_name,
            (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE seller_order_id = so.id) AS item_count
       FROM seller_orders so JOIN users u ON u.id = so.seller_id
      WHERE so.order_id = ? ORDER BY so.id`,
  );
  const thumbStmt = db.prepare(
    `SELECT (SELECT file_path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY position LIMIT 1) AS img
       FROM order_items oi JOIN seller_orders so ON so.id = oi.seller_order_id
      WHERE so.order_id = ? LIMIT 4`,
  );

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      totalAmd: o.total_amd,
      createdAt: o.created_at,
      images: thumbStmt.all(o.id).map((r) => imageUrls(r.img)).filter(Boolean),
      parts: partsStmt.all(o.id).map((p) => ({
        id: p.id, status: p.status, subtotalAmd: p.subtotal_amd, storeName: p.store_name, itemCount: p.item_count,
      })),
    })),
    total, page, pages: Math.max(1, Math.ceil(total / size)),
  });
});

// GET /orders/:id — owner of the order only
router.get('/orders/:id', (req, res) => {
  const id = idParam(req.params.id, 'Order');
  const db = getDb();
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND buyer_id = ?').get(id, req.user.id);
  if (!o) throw notFound('Order');

  const parts = db
    .prepare(
      `SELECT so.*, u.store_name, u.phone AS seller_phone FROM seller_orders so JOIN users u ON u.id = so.seller_id
        WHERE so.order_id = ? ORDER BY so.id`,
    )
    .all(id);
  const itemsStmt = db.prepare(
    `SELECT oi.*,
            (SELECT file_path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY position LIMIT 1) AS img,
            EXISTS (SELECT 1 FROM reviews r WHERE r.product_id = oi.product_id AND r.buyer_id = ?) AS reviewed
       FROM order_items oi WHERE oi.seller_order_id = ? ORDER BY oi.id`,
  );
  const historyStmt = db.prepare(
    `SELECT h.from_status, h.to_status, h.created_at, h.changed_by = ? AS by_me
       FROM status_history h WHERE h.seller_order_id = ? ORDER BY h.id`,
  );

  res.json({
    order: {
      id: o.id,
      createdAt: o.created_at,
      totalAmd: o.total_amd,
      address: {
        recipient: o.recipient, phone: o.phone, region: o.region, city: o.city,
        street: o.street, apartment: o.apartment, note: o.note,
      },
      parts: parts.map((p) => ({
        id: p.id,
        status: p.status,
        subtotalAmd: p.subtotal_amd,
        storeName: p.store_name,
        sellerPhone: p.seller_phone,
        updatedAt: p.updated_at,
        canCancel: allowedMoves(p.status, 'buyer').includes('cancelled'),
        items: itemsStmt.all(req.user.id, p.id).map((i) => ({
          id: i.id,
          productId: i.product_id,
          title: i.title,
          unitPriceAmd: i.unit_price_amd,
          quantity: i.quantity,
          lineTotal: i.unit_price_amd * i.quantity,
          image: imageUrls(i.img),
          reviewed: Boolean(i.reviewed),
          canReview: p.status === 'delivered' && !i.reviewed,
        })),
        history: historyStmt.all(req.user.id, p.id).map((h) => ({
          from: h.from_status, to: h.to_status, at: h.created_at, byMe: Boolean(h.by_me),
        })),
      })),
    },
  });
});

// POST /orders/:id/sellers/:sellerOrderId/cancel — owner of the order, while Placed or Confirmed
router.post('/orders/:id/sellers/:sellerOrderId/cancel', (req, res) => {
  const orderId = idParam(req.params.id, 'Order');
  const sellerOrderId = idParam(req.params.sellerOrderId, 'Order');
  const db = getDb();
  const so = db
    .prepare(
      `SELECT so.id FROM seller_orders so JOIN orders o ON o.id = so.order_id
        WHERE so.id = ? AND so.order_id = ? AND o.buyer_id = ?`,
    )
    .get(sellerOrderId, orderId, req.user.id);
  if (!so) throw notFound('Order');
  const updated = changeStatus({ sellerOrderId, to: 'cancelled', actor: req.user, role: 'buyer' });
  res.json({ sellerOrder: { id: updated.id, status: updated.status } });
});

export default router;
