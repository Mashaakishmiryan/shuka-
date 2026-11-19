import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { config } from './config.js';
import { HttpError } from './errors.js';

export const MAX_IMAGES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']);
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'avif']);

export const THUMB_SIZE = 400;
export const LARGE_SIZE = 1200;

/** multer keeps uploads in memory (bounded by the size limit) so nothing unchecked touches the disk. */
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_IMAGES, fields: 10 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new HttpError(400, 'UPLOAD_BAD_TYPE', `"${file.originalname}" is not a JPEG, PNG or WebP image`));
    }
    cb(null, true);
  },
}).array('images', MAX_IMAGES);

/** Public URLs for a stored image path. */
export const imageUrls = (filePath) =>
  filePath ? { thumb: `/uploads/${filePath}-thumb.webp`, large: `/uploads/${filePath}-large.webp` } : null;

/**
 * Check the real content (not the file name or the browser's claimed type),
 * then write a thumbnail and a large WebP version into the uploads folder.
 * Returns the relative path to store in SQLite. Runs OUTSIDE any transaction.
 */
export async function processImage(buffer, productId, originalName = 'image', { allowSvg = false } = {}) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: 50e6 }).metadata();
  } catch {
    throw new HttpError(400, 'UPLOAD_BAD_TYPE', `"${originalName}" is not a valid image`);
  }
  // SVG is only accepted from our own seed script, never from uploads.
  if (!ALLOWED_FORMATS.has(meta.format) && !(allowSvg && meta.format === 'svg')) {
    throw new HttpError(400, 'UPLOAD_BAD_TYPE', `"${originalName}" is not a JPEG, PNG or WebP image`);
  }

  const rel = path.posix.join('products', String(productId), crypto.randomBytes(9).toString('base64url'));
  const abs = path.join(config.uploadsDir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });

  try {
    const base = () => sharp(buffer, { limitInputPixels: 50e6 }).rotate(); // apply EXIF orientation
    await Promise.all([
      base().resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' }).webp({ quality: 78 }).toFile(`${abs}-thumb.webp`),
      base().resize(LARGE_SIZE, LARGE_SIZE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toFile(`${abs}-large.webp`),
    ]);
  } catch {
    await removeImageFiles(rel);
    throw new HttpError(400, 'UPLOAD_BAD_TYPE', `"${originalName}" could not be processed`);
  }
  return rel;
}

export async function removeImageFiles(rel) {
  const abs = path.join(config.uploadsDir, rel);
  await Promise.all(['-thumb.webp', '-large.webp'].map((s) => fs.rm(abs + s, { force: true })));
}
