import { Router } from 'express';
import { getDb, nowIso } from '../db.js';
import { conflict, forbidden, notFound } from '../errors.js';
import { idParam, validate } from '../validate.js';
import { requireUser } from '../auth.js';

const router = Router();

// POST /products/:id/reviews — a buyer with a delivered item, once per product
router.post('/products/:id/reviews', requireUser, (req, res) => {
  const productId = idParam(req.params.id, 'Product');
  const { rating, body } = validate(req.body, {
    rating: { type: 'int', required: true, min: 1, max: 5 },
    body: { type: 'string', max: 2000, default: '' },
  });
  const db = getDb();

  const review = db.transaction(() => {
    if (!db.prepare('SELECT 1 FROM products WHERE id = ?').get(productId)) throw notFound('Product');

    const delivered = db
      .prepare(
        `SELECT 1 FROM order_items oi
           JOIN seller_orders so ON so.id = oi.seller_order_id
           JOIN orders o ON o.id = so.order_id
          WHERE oi.product_id = ? AND o.buyer_id = ? AND so.status = 'delivered' LIMIT 1`,
      )
      .get(productId, req.user.id);
    if (!delivered) throw forbidden('You can review a product only after it was delivered to you');

    let id;
    try {
      id = db
        .prepare('INSERT INTO reviews (product_id, buyer_id, rating, body, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(productId, req.user.id, rating, body, nowIso()).lastInsertRowid;
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw conflict('ALREADY_REVIEWED', 'You already reviewed this product');
      throw e;
    }

    // Recompute the average from the reviews table so it can never drift.
    db.prepare(
      `UPDATE products SET
         rating_count = (SELECT COUNT(*) FROM reviews WHERE product_id = ?),
         rating_avg   = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = ?)
       WHERE id = ?`,
    ).run(productId, productId, productId);

    return { id };
  }).immediate();

  const p = db.prepare('SELECT rating_avg, rating_count FROM products WHERE id = ?').get(productId);
  res.status(201).json({
    review: { id: Number(review.id), rating, body },
    product: { ratingAvg: Math.round(p.rating_avg * 10) / 10, ratingCount: p.rating_count },
  });
});

export default router;
