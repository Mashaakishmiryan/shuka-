import { Router } from 'express';
import { getDb, nowIso } from '../db.js';
import { HttpError, conflict, notFound, badRequest } from '../errors.js';
import { idParam, validate, phoneRule } from '../validate.js';
import { requireUser, requireSeller, publicUser } from '../auth.js';
import { uploadImages, processImage, removeImageFiles, imageUrls, MAX_IMAGES } from '../images.js';
import { STATUSES, allowedMoves, changeStatus } from '../lifecycle.js';

const router = Router();

/* ───────────── Become a seller ───────────── */

// POST /seller/activate — signed in. Store name + phone; active at once.
router.post('/seller/activate', requireUser, (req, res) => {
  const data = validate(req.body, {
    storeName: { type: 'string', required: true, min: 2, max: 60 },
    phone: phoneRule,
  });
  const db = getDb();
  if (req.user.store_name) throw conflict('ALREADY_SELLER', 'You are already a seller');
  try {
    db.prepare('UPDATE users SET store_name = ?, phone = ? WHERE id = ?').run(data.storeName, data.phone, req.user.id);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw conflict('STORE_NAME_TAKEN', 'This store name is already taken', { fields: { storeName: 'taken' } });
    }
    throw e;
  }
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

router.use('/seller', requireSeller);

/* ───────────── Overview (plain SQL) ───────────── */

// GET /seller/overview
router.get('/seller/overview', (req, res) => {
  const db = getDb();
  const sellerId = req.user.id;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db
    .prepare('SELECT status, COUNT(*) AS n FROM seller_orders WHERE seller_id = ? GROUP BY status')
    .all(sellerId)) counts[r.status] = r.n;

  // Revenue = delivered seller orders whose delivery happened in the last 30 days.
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const revenue = db
    .prepare(
      `SELECT COALESCE(SUM(so.subtotal_amd), 0) AS revenue, COUNT(*) AS orders
         FROM seller_orders so
        WHERE so.seller_id = ? AND so.status = 'delivered'
          AND EXISTS (SELECT 1 FROM status_history h
                       WHERE h.seller_order_id = so.id AND h.to_status = 'delivered' AND h.created_at >= ?)`,
    )
    .get(sellerId, since);
  const allTime = db
    .prepare(
      `SELECT COALESCE(SUM(subtotal_amd), 0) AS revenue FROM seller_orders WHERE seller_id = ? AND status = 'delivered'`,
    )
    .get(sellerId);
  const products = db
    .prepare(
      `SELECT COUNT(*) AS total, COALESCE(SUM(is_published), 0) AS published,
              COALESCE(SUM(CASE WHEN is_published = 1 AND stock = 0 THEN 1 ELSE 0 END), 0) AS sold_out
         FROM products WHERE seller_id = ?`,
    )
    .get(sellerId);

  res.json({
    overview: {
      toConfirm: counts.placed,
      toShip: counts.confirmed,
      ordersByStatus: counts,
      revenue30d: revenue.revenue,
      deliveredOrders30d: revenue.orders,
      revenueAllTime: allTime.revenue,
      products: { total: products.total, published: products.published, soldOut: products.sold_out },
    },
  });
});

/* ───────────── Products ───────────── */

const productRules = {
  title: { type: 'string', required: true, min: 3, max: 120 },
  categoryId: { type: 'int', required: true, min: 1 },
  description: { type: 'string', required: true, min: 10, max: 5000 },
  priceAmd: { type: 'int', required: true, min: 1, max: 100_000_000 },
  stock: { type: 'int', required: true, min: 0, max: 100_000 },
};

function ownProduct(db, productId, sellerId) {
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND seller_id = ?').get(productId, sellerId);
  if (!p) throw notFound('Product');
  return p;
}

function productForEditor(db, p) {
  const images = db
    .prepare('SELECT id, file_path, position FROM product_images WHERE product_id = ? ORDER BY position')
    .all(p.id)
    .map((i) => ({ id: i.id, position: i.position, ...imageUrls(i.file_path) }));
  const { sold } = db
    .prepare(
      `SELECT COALESCE(SUM(oi.quantity), 0) AS sold FROM order_items oi
         JOIN seller_orders so ON so.id = oi.seller_order_id
        WHERE oi.product_id = ? AND so.status != 'cancelled'`,
    )
    .get(p.id);
  return {
    id: p.id,
    title: p.title,
    categoryId: p.category_id,
    description: p.description,
    priceAmd: p.price_amd,
    stock: p.stock,
    isPublished: Boolean(p.is_published),
    ratingAvg: Math.round(p.rating_avg * 10) / 10,
    ratingCount: p.rating_count,
    unitsSold: sold,
    images,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

function checkCategory(db, categoryId) {
  if (categoryId !== undefined && !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId)) {
    throw badRequest('Please check the highlighted fields', { categoryId: 'invalid' });
  }
}

// GET /seller/products — the seller's own products
router.get('/seller/products', (req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.title, p.price_amd, p.stock, p.is_published, p.rating_avg, p.rating_count, p.created_at,
              c.slug AS category_slug,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1) AS main_image,
              (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS image_count,
              (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi
                 JOIN seller_orders so ON so.id = oi.seller_order_id
                WHERE oi.product_id = p.id AND so.status != 'cancelled') AS units_sold
         FROM products p JOIN categories c ON c.id = p.category_id
        WHERE p.seller_id = ?
        ORDER BY p.created_at DESC, p.id DESC`,
    )
    .all(req.user.id);
  res.json({
    products: rows.map((r) => ({
      id: r.id,
      title: r.title,
      priceAmd: r.price_amd,
      stock: r.stock,
      isPublished: Boolean(r.is_published),
      ratingAvg: Math.round(r.rating_avg * 10) / 10,
      ratingCount: r.rating_count,
      categorySlug: r.category_slug,
      image: imageUrls(r.main_image),
      imageCount: r.image_count,
      unitsSold: r.units_sold,
      createdAt: r.created_at,
    })),
  });
});

// GET /seller/products/:id — for the product editor
router.get('/seller/products/:id', (req, res) => {
  const db = getDb();
  const p = ownProduct(db, idParam(req.params.id, 'Product'), req.user.id);
  res.json({ product: productForEditor(db, p) });
});

// POST /seller/products — created unpublished; it can be published once it has an image
router.post('/seller/products', (req, res) => {
  const data = validate(req.body, productRules);
  const db = getDb();
  checkCategory(db, data.categoryId);
  const now = nowIso();
  const id = db
    .prepare(
      `INSERT INTO products (seller_id, category_id, title, description, price_amd, stock, is_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(req.user.id, data.categoryId, data.title, data.description, data.priceAmd, data.stock, now, now).lastInsertRowid;
  res.status(201).json({ product: productForEditor(db, ownProduct(db, id, req.user.id)) });
});

// PATCH /seller/products/:id — edit fields, publish/unpublish, reorder images (first = main)
router.patch('/seller/products/:id', (req, res) => {
  const productId = idParam(req.params.id, 'Product');
  const data = validate(req.body, { ...productRules, isPublished: { type: 'bool' } }, { partial: true });
  const imageOrder = req.body?.imageOrder;
  if (imageOrder !== undefined && (!Array.isArray(imageOrder) || !imageOrder.every(Number.isSafeInteger))) {
    throw badRequest('imageOrder must be a list of image ids', { imageOrder: 'invalid' });
  }
  const db = getDb();
  checkCategory(db, data.categoryId);

  db.transaction(() => {
    const p = ownProduct(db, productId, req.user.id);

    if (imageOrder) {
      const current = db.prepare('SELECT id, file_path FROM product_images WHERE product_id = ?').all(productId);
      const byId = new Map(current.map((i) => [i.id, i]));
      if (imageOrder.length !== current.length || new Set(imageOrder).size !== current.length || !imageOrder.every((id) => byId.has(id))) {
        throw badRequest('imageOrder must list every image of this product once', { imageOrder: 'invalid' });
      }
      // Rewrite positions (delete + re-insert keeps UNIQUE(product_id, position) happy).
      db.prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
      const ins = db.prepare('INSERT INTO product_images (id, product_id, file_path, position) VALUES (?, ?, ?, ?)');
      imageOrder.forEach((imgId, pos) => ins.run(imgId, productId, byId.get(imgId).file_path, pos));
    }

    if (data.isPublished === true) {
      const { n } = db.prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(productId);
      if (n === 0) throw conflict('NEEDS_IMAGE', 'Add at least one image before publishing', { fields: { images: 'required' } });
    }

    db.prepare(
      `UPDATE products SET
         title = ?, category_id = ?, description = ?, price_amd = ?, stock = ?, is_published = ?, updated_at = ?
       WHERE id = ? AND seller_id = ?`,
    ).run(
      data.title ?? p.title,
      data.categoryId ?? p.category_id,
      data.description ?? p.description,
      data.priceAmd ?? p.price_amd,
      data.stock ?? p.stock,
      data.isPublished === undefined ? p.is_published : Number(data.isPublished),
      nowIso(),
      productId,
      req.user.id,
    );
  }).immediate();

  res.json({ product: productForEditor(db, ownProduct(db, productId, req.user.id)) });
});

// POST /seller/products/:id/images — multipart field "images", up to 5 in total
router.post('/seller/products/:id/images', (req, res, next) => {
  // Check ownership BEFORE accepting any file data.
  try {
    ownProduct(getDb(), idParam(req.params.id, 'Product'), req.user.id);
  } catch (e) {
    return next(e);
  }
  uploadImages(req, res, next);
}, async (req, res) => {
  const productId = Number(req.params.id);
  const db = getDb();
  const files = req.files || [];
  if (files.length === 0) throw badRequest('Choose at least one image', { images: 'required' });

  const { n } = db.prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(productId);
  if (n + files.length > MAX_IMAGES) {
    throw new HttpError(400, 'TOO_MANY_IMAGES', `A product can have at most ${MAX_IMAGES} images (it has ${n})`);
  }

  // Resize and write files first — never inside a transaction.
  const saved = [];
  try {
    for (const f of files) saved.push(await processImage(f.buffer, productId, f.originalname));
  } catch (e) {
    await Promise.all(saved.map(removeImageFiles));
    throw e;
  }

  // Then a short transaction that only records the paths.
  try {
    db.transaction(() => {
      const rows = db.prepare('SELECT position FROM product_images WHERE product_id = ?').all(productId);
      if (rows.length + saved.length > MAX_IMAGES) {
        throw new HttpError(400, 'TOO_MANY_IMAGES', `A product can have at most ${MAX_IMAGES} images`);
      }
      const used = new Set(rows.map((r) => r.position));
      const ins = db.prepare('INSERT INTO product_images (product_id, file_path, position) VALUES (?, ?, ?)');
      let pos = 0;
      for (const rel of saved) {
        while (used.has(pos)) pos++;
        ins.run(productId, rel, pos);
        used.add(pos);
      }
      db.prepare('UPDATE products SET updated_at = ? WHERE id = ?').run(nowIso(), productId);
    }).immediate();
  } catch (e) {
    await Promise.all(saved.map(removeImageFiles));
    throw e;
  }

  res.status(201).json({ product: productForEditor(db, ownProduct(db, productId, req.user.id)) });
});

// DELETE /seller/products/:id/images?imageId=  (also /seller/products/:id/images/:imageId)
async function deleteImage(req, res) {
  const productId = idParam(req.params.id, 'Product');
  const imageId = idParam(req.params.imageId ?? req.query.imageId, 'Image');
  const db = getDb();

  const removed = db.transaction(() => {
    const p = ownProduct(db, productId, req.user.id);
    const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(imageId, productId);
    if (!img) throw notFound('Image');
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(productId);
    if (n === 1 && p.is_published) {
      throw conflict('LAST_IMAGE', 'A published product needs at least one image — unpublish it first or add another image');
    }
    db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);
    // Close the gap so position 0 is always the main image (ascending order avoids UNIQUE clashes).
    const after = db.prepare('SELECT id FROM product_images WHERE product_id = ? AND position > ? ORDER BY position').all(productId, img.position);
    const move = db.prepare('UPDATE product_images SET position = position - 1 WHERE id = ?');
    for (const r of after) move.run(r.id);
    return img.file_path;
  }).immediate();

  await removeImageFiles(removed);
  res.json({ product: productForEditor(db, ownProduct(db, productId, req.user.id)) });
}
router.delete('/seller/products/:id/images', deleteImage);
router.delete('/seller/products/:id/images/:imageId', deleteImage);

/* ───────────── Orders ───────────── */

// GET /seller/orders?status=&page= — own seller orders, newest first, with counts per status
router.get('/seller/orders', (req, res) => {
  const db = getDb();
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const size = 20;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of db.prepare('SELECT status, COUNT(*) AS n FROM seller_orders WHERE seller_id = ? GROUP BY status').all(req.user.id)) {
    counts[r.status] = r.n;
  }

  const where = status ? 'so.seller_id = ? AND so.status = ?' : 'so.seller_id = ?';
  const params = status ? [req.user.id, status] : [req.user.id];
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM seller_orders so WHERE ${where}`).get(...params);
  const rows = db
    .prepare(
      `SELECT so.id, so.order_id, so.status, so.subtotal_amd, so.updated_at, o.created_at, o.recipient, o.city, o.region,
              (SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE seller_order_id = so.id) AS item_count
         FROM seller_orders so JOIN orders o ON o.id = so.order_id
        WHERE ${where}
        ORDER BY so.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, size, (page - 1) * size);

  res.json({
    counts,
    orders: rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      status: r.status,
      subtotalAmd: r.subtotal_amd,
      itemCount: r.item_count,
      recipient: r.recipient,
      city: r.city,
      region: r.region,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    total, page, pages: Math.max(1, Math.ceil(total / size)),
  });
});

// GET /seller/orders/:id — own seller order only (scoped by seller_id)
router.get('/seller/orders/:id', (req, res) => {
  const id = idParam(req.params.id, 'Order');
  const db = getDb();
  const so = db
    .prepare(
      `SELECT so.*, o.recipient, o.phone, o.region, o.city, o.street, o.apartment, o.note, o.created_at AS ordered_at,
              u.name AS buyer_name
         FROM seller_orders so
         JOIN orders o ON o.id = so.order_id
         JOIN users u ON u.id = o.buyer_id
        WHERE so.id = ? AND so.seller_id = ?`,
    )
    .get(id, req.user.id);
  if (!so) throw notFound('Order');

  const items = db
    .prepare(
      `SELECT oi.*, (SELECT file_path FROM product_images pi WHERE pi.product_id = oi.product_id ORDER BY position LIMIT 1) AS img
         FROM order_items oi WHERE oi.seller_order_id = ? ORDER BY oi.id`,
    )
    .all(id);
  const history = db
    .prepare(
      `SELECT h.from_status, h.to_status, h.created_at, u.name AS by_name, (h.changed_by = ?) AS by_me
         FROM status_history h JOIN users u ON u.id = h.changed_by
        WHERE h.seller_order_id = ? ORDER BY h.id`,
    )
    .all(req.user.id, id);

  res.json({
    order: {
      id: so.id,
      orderId: so.order_id,
      status: so.status,
      orderedAt: so.ordered_at,
      updatedAt: so.updated_at,
      buyerName: so.buyer_name,
      delivery: {
        recipient: so.recipient, phone: so.phone, region: so.region, city: so.city,
        street: so.street, apartment: so.apartment, note: so.note,
      },
      items: items.map((i) => ({
        id: i.id, productId: i.product_id, title: i.title, unitPriceAmd: i.unit_price_amd,
        quantity: i.quantity, lineTotal: i.unit_price_amd * i.quantity, image: imageUrls(i.img),
      })),
      cashToCollect: so.subtotal_amd,
      allowedMoves: allowedMoves(so.status, 'seller'),
      history: history.map((h) => ({
        from: h.from_status, to: h.to_status, at: h.created_at, by: h.by_me ? 'seller' : 'buyer', byName: h.by_name,
      })),
    },
  });
});

// POST /seller/orders/:id/status  { "to": "shipped" } — the only way a seller changes a status
router.post('/seller/orders/:id/status', (req, res) => {
  const sellerOrderId = idParam(req.params.id, 'Order');
  const { to } = validate(req.body, { to: { type: 'string', required: true, max: 20 } });
  const updated = changeStatus({ sellerOrderId, to, actor: req.user, role: 'seller' });
  res.json({ sellerOrder: { id: updated.id, status: updated.status, allowedMoves: allowedMoves(updated.status, 'seller') } });
});

export default router;
