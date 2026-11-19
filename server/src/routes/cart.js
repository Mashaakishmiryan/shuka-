import { Router } from 'express';
import { getDb } from '../db.js';
import { conflict, forbidden, notFound } from '../errors.js';
import { idParam, validate } from '../validate.js';
import { requireUser } from '../auth.js';
import { imageUrls } from '../images.js';

const router = Router();
router.use('/cart', requireUser);

export const MAX_QTY_PER_ITEM = 99;

/**
 * The cart grouped by seller, with warnings for items whose price changed
 * or that sold out / were unpublished since they were added.
 */
export function loadCart(userId) {
  const rows = getDb()
    .prepare(
      `SELECT ci.product_id, ci.quantity, ci.price_when_added,
              p.title, p.price_amd, p.stock, p.is_published, p.seller_id, u.store_name,
              (SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1) AS main_image
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         JOIN users u ON u.id = p.seller_id
        WHERE ci.user_id = ?
        ORDER BY u.store_name, p.title`,
    )
    .all(userId);

  const groups = new Map();
  let total = 0;
  let itemCount = 0;
  let hasProblems = false;

  for (const r of rows) {
    const available = r.is_published === 1 && r.stock > 0;
    const item = {
      productId: r.product_id,
      title: r.title,
      image: imageUrls(r.main_image),
      quantity: r.quantity,
      priceAmd: r.price_amd,
      priceWhenAdded: r.price_when_added,
      priceChanged: r.price_amd !== r.price_when_added,
      stock: r.stock,
      available,
      exceedsStock: available && r.quantity > r.stock,
      lineTotal: r.price_amd * r.quantity,
    };
    if (item.priceChanged || !available || item.exceedsStock) hasProblems = true;

    if (!groups.has(r.seller_id)) {
      groups.set(r.seller_id, { sellerId: r.seller_id, storeName: r.store_name, items: [], subtotal: 0 });
    }
    const g = groups.get(r.seller_id);
    g.items.push(item);
    if (available) {
      g.subtotal += item.lineTotal;
      total += item.lineTotal;
    }
    itemCount += r.quantity;
  }

  return { groups: [...groups.values()], total, itemCount, hasProblems };
}

// GET /cart
router.get('/cart', (req, res) => {
  res.json({ cart: loadCart(req.user.id) });
});

// PUT /cart/items/:productId — set quantity (adds the item if not in the cart).
// Body: { quantity, acceptPrice? }. acceptPrice=true accepts the current price after a price change.
router.put('/cart/items/:productId', (req, res) => {
  const productId = idParam(req.params.productId, 'Product');
  const { quantity, acceptPrice } = validate(req.body, {
    quantity: { type: 'int', required: true, min: 1, max: MAX_QTY_PER_ITEM },
    acceptPrice: { type: 'bool', default: false },
  });
  const db = getDb();

  db.transaction(() => {
    const p = db.prepare('SELECT id, title, price_amd, stock, is_published, seller_id FROM products WHERE id = ?').get(productId);
    if (!p || !p.is_published) throw notFound('Product');
    if (p.seller_id === req.user.id) throw forbidden('You cannot buy your own product');
    if (p.stock === 0) throw conflict('OUT_OF_STOCK', `"${p.title}" is out of stock`, { productId, stock: 0, title: p.title });
    if (quantity > p.stock) {
      throw conflict('NOT_ENOUGH_STOCK', `Only ${p.stock} of "${p.title}" left`, { productId, stock: p.stock, title: p.title });
    }

    // A new item records today's price. Changing the quantity keeps the original price,
    // so a price change is still noticed at checkout — unless the buyer accepts it.
    db.prepare(
      `INSERT INTO cart_items (user_id, product_id, quantity, price_when_added) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_id, product_id) DO UPDATE SET
         quantity = excluded.quantity,
         price_when_added = CASE WHEN ? THEN excluded.price_when_added ELSE cart_items.price_when_added END`,
    ).run(req.user.id, productId, quantity, p.price_amd, acceptPrice ? 1 : 0);
  }).immediate();

  res.json({ cart: loadCart(req.user.id) });
});

// DELETE /cart/items/:productId
router.delete('/cart/items/:productId', (req, res) => {
  const productId = idParam(req.params.productId, 'Product');
  getDb().prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?').run(req.user.id, productId);
  res.json({ cart: loadCart(req.user.id) });
});

export default router;
