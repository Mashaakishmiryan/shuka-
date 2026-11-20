import { Router } from 'express';
import { getDb } from '../db.js';
import { notFound } from '../errors.js';
import { idParam } from '../validate.js';
import { imageUrls } from '../images.js';

const router = Router();
export const PAGE_SIZE = 24;

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_amd ASC, p.id DESC',
  price_desc: 'p.price_amd DESC, p.id DESC',
  rating: 'p.rating_avg DESC, p.rating_count DESC, p.id DESC',
};

/** Shape of a product card in lists. */
export const productCard = (r) => ({
  id: r.id,
  title: r.title,
  priceAmd: r.price_amd,
  stock: r.stock,
  ratingAvg: Math.round(r.rating_avg * 10) / 10,
  ratingCount: r.rating_count,
  image: imageUrls(r.main_image),
  category: r.category_slug ? { slug: r.category_slug, name: r.category_name } : undefined,
  storeName: r.store_name,
});

const MAIN_IMAGE_SQL =
  '(SELECT file_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY position LIMIT 1)';

const intOrNull = (v) => (v !== undefined && /^\d{1,12}$/.test(String(v)) ? Number(v) : null);

// GET /categories — anyone
router.get('/categories', (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT c.id, c.name, c.slug,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_published = 1) AS product_count,
              (SELECT pi.file_path FROM products p JOIN product_images pi ON pi.product_id = p.id
                WHERE p.category_id = c.id AND p.is_published = 1
                ORDER BY p.rating_count DESC, p.created_at DESC, pi.position LIMIT 1) AS image
         FROM categories c ORDER BY c.id`,
    )
    .all();
  res.json({
    categories: rows.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, productCount: c.product_count, image: imageUrls(c.image),
    })),
  });
});

// GET /products?q=&category=&minPrice=&maxPrice=&sort=&page= — anyone
router.get('/products', (req, res) => {
  const db = getDb();
  const where = ['p.is_published = 1'];
  const params = [];

  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (q) {
    // Every word must appear in the title or the description. Case-insensitive for Armenian too.
    for (const word of q.split(/\s+/).slice(0, 8)) {
      const like = `%${word.toLowerCase().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
      where.push("(ulower(p.title) LIKE ? ESCAPE '\\' OR ulower(p.description) LIKE ? ESCAPE '\\')");
      params.push(like, like);
    }
  }

  let category = null;
  if (typeof req.query.category === 'string' && req.query.category) {
    category = db.prepare('SELECT id, name, slug FROM categories WHERE slug = ?').get(req.query.category);
    if (!category) throw notFound('Category');
    where.push('p.category_id = ?');
    params.push(category.id);
  }

  const minPrice = intOrNull(req.query.minPrice);
  const maxPrice = intOrNull(req.query.maxPrice);
  if (minPrice !== null) { where.push('p.price_amd >= ?'); params.push(minPrice); }
  if (maxPrice !== null) { where.push('p.price_amd <= ?'); params.push(maxPrice); }

  const sort = SORTS[req.query.sort] ? req.query.sort : 'newest';
  const page = Math.max(1, Math.min(intOrNull(req.query.page) ?? 1, 10000));
  const whereSql = where.join(' AND ');

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM products p WHERE ${whereSql}`).get(...params);
  const rows = db
    .prepare(
      `SELECT p.*, ${MAIN_IMAGE_SQL} AS main_image, c.slug AS category_slug, c.name AS category_name, u.store_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
        WHERE ${whereSql}
        ORDER BY ${SORTS[sort]}
        LIMIT ? OFFSET ?`,
    )
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE);

  res.json({
    items: rows.map(productCard),
    total,
    page,
    pageSize: PAGE_SIZE,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    sort,
    category,
  });
});

// GET /products/:id — anyone (an unpublished product is visible only to its seller)
router.get('/products/:id', (req, res) => {
  const id = idParam(req.params.id, 'Product');
  const db = getDb();
  const p = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, u.store_name, u.avatar AS seller_avatar
         FROM products p
         JOIN categories c ON c.id = p.category_id
         JOIN users u ON u.id = p.seller_id
        WHERE p.id = ? AND (p.is_published = 1 OR p.seller_id = ?)`,
    )
    .get(id, req.user?.id ?? -1);
  if (!p) throw notFound('Product');

  const images = db
    .prepare('SELECT id, file_path, position FROM product_images WHERE product_id = ? ORDER BY position')
    .all(id)
    .map((i) => ({ id: i.id, position: i.position, ...imageUrls(i.file_path) }));

  res.json({
    product: {
      id: p.id,
      title: p.title,
      description: p.description,
      priceAmd: p.price_amd,
      stock: p.stock,
      isPublished: Boolean(p.is_published),
      ratingAvg: Math.round(p.rating_avg * 10) / 10,
      ratingCount: p.rating_count,
      category: { slug: p.category_slug, name: p.category_name },
      seller: { id: p.seller_id, storeName: p.store_name, avatar: p.seller_avatar ?? null },
      isOwn: req.user?.id === p.seller_id,
      images,
      createdAt: p.created_at,
    },
  });
});

// GET /products/:id/reviews — anyone, newest first
router.get('/products/:id/reviews', (req, res) => {
  const id = idParam(req.params.id, 'Product');
  const db = getDb();
  if (!db.prepare('SELECT 1 FROM products WHERE id = ? AND (is_published = 1 OR seller_id = ?)').get(id, req.user?.id ?? -1)) {
    throw notFound('Product');
  }
  const page = Math.max(1, intOrNull(req.query.page) ?? 1);
  const size = 20;
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM reviews WHERE product_id = ?').get(id);
  const rows = db
    .prepare(
      `SELECT r.id, r.rating, r.body, r.created_at, u.name, u.avatar
         FROM reviews r JOIN users u ON u.id = r.buyer_id
        WHERE r.product_id = ?
        ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    )
    .all(id, size, (page - 1) * size);
  res.json({
    reviews: rows.map((r) => ({
      id: r.id, rating: r.rating, body: r.body, createdAt: r.created_at, avatar: r.avatar ?? null,
      // Show first name + initial only.
      author: r.name.split(/\s+/).map((w, i) => (i === 0 ? w : `${w[0]}.`)).join(' '),
    })),
    total, page, pages: Math.max(1, Math.ceil(total / size)),
  });
});

export default router;
