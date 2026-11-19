import { Router } from 'express';
import { getDb } from '../db.js';
import { conflict, HttpError } from '../errors.js';
import { validate, emailRule, passwordRule, nameRule, phoneRule } from '../validate.js';
import {
  hashPassword, checkPassword, setSessionCookie, clearSessionCookie, requireUser, publicUser,
} from '../auth.js';

const router = Router();

// A real hash to compare against when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = await hashPassword('not-a-real-password');

/** The delivery address of the user's last order, used to pre-fill checkout. */
function lastAddress(userId) {
  const row = getDb()
    .prepare(
      `SELECT recipient, phone, region, city, street, apartment
         FROM orders WHERE buyer_id = ? ORDER BY id DESC LIMIT 1`,
    )
    .get(userId);
  return row || null;
}

const meResponse = (user) => ({ user: { ...publicUser(user), lastAddress: lastAddress(user.id) } });

// POST /auth/register — anyone
router.post('/auth/register', async (req, res) => {
  const data = validate(req.body, {
    email: emailRule, password: passwordRule, name: nameRule, phone: phoneRule,
  });
  const db = getDb();
  const hash = await hashPassword(data.password); // hashing happens before (outside) the write
  let user;
  try {
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (email, password_hash, name, phone) VALUES (?, ?, ?, ?)')
      .run(data.email, hash, data.name, data.phone);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw conflict('EMAIL_TAKEN', 'An account with this email already exists', { fields: { email: 'taken' } });
    }
    throw e;
  }
  setSessionCookie(res, user);
  res.status(201).json(meResponse(user));
});

// POST /auth/login — anyone
router.post('/auth/login', async (req, res) => {
  const data = validate(req.body, {
    email: emailRule, password: { type: 'string', required: true, max: 200 },
  });
  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  const ok = await checkPassword(data.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, 'BAD_CREDENTIALS', 'Wrong email or password');
  setSessionCookie(res, user);
  res.json(meResponse(user));
});

// POST /auth/logout — anyone
router.post('/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

// GET /me — signed in
router.get('/me', requireUser, (req, res) => {
  res.json(meResponse(req.user));
});

// PATCH /me — signed in: edit name and phone
router.patch('/me', requireUser, (req, res) => {
  const data = validate(req.body, { name: nameRule, phone: phoneRule }, { partial: true });
  const db = getDb();
  if (Object.keys(data).length) {
    db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?')
      .run(data.name ?? null, data.phone ?? null, req.user.id);
  }
  res.json(meResponse(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

export default router;
