import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { getDb } from './db.js';
import { unauthorized, forbidden } from './errors.js';

export const COOKIE_NAME = 'shuka_session';
const BCRYPT_ROUNDS = 11;

export const hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_ROUNDS);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

/*
 * Session = signed cookie "<base64url payload>.<HMAC-SHA256>".
 * The payload holds the user id, expiry and a fingerprint of the password hash,
 * so changing a password invalidates old sessions. Nothing is stored in the DB.
 */
const sign = (data) => crypto.createHmac('sha256', config.sessionSecret).update(data).digest('base64url');
const pwFingerprint = (hash) => crypto.createHash('sha256').update(hash).digest('base64url').slice(0, 12);

export function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({ uid: user.id, exp: Date.now() + config.sessionDays * 864e5, pw: pwFingerprint(user.password_hash) }),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, mac] = token.split('.');
  const expected = sign(payload);
  if (!mac || mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(data.uid) || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isProd,
  path: '/',
  maxAge: config.sessionDays * 864e5,
});

export function setSessionCookie(res, user) {
  res.cookie(COOKIE_NAME, createSessionToken(user), cookieOptions());
}
export function clearSessionCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
}

/** Loads req.user (or null) on every request from the session cookie. */
export function loadUser(req, _res, next) {
  req.user = null;
  const data = readSessionToken(req.cookies?.[COOKIE_NAME]);
  if (data) {
    const user = getDb()
      .prepare('SELECT id, email, password_hash, name, phone, store_name, created_at FROM users WHERE id = ?')
      .get(data.uid);
    if (user && pwFingerprint(user.password_hash) === data.pw) req.user = user;
  }
  next();
}

export function requireUser(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireSeller(req, _res, next) {
  if (!req.user) return next(unauthorized());
  if (!req.user.store_name) return next(forbidden('Become a seller first'));
  next();
}

/** The user as the API exposes it (never the password hash). */
export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone,
  storeName: u.store_name,
  isSeller: Boolean(u.store_name),
  createdAt: u.created_at,
});
