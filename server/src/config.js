import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');

const isProd = process.env.NODE_ENV === 'production';

// DATA_DIR holds the SQLite file, the uploads folder and backups.
// In production point it at the persistent disk (e.g. /var/data on Render).
const dataDir = path.resolve(process.env.DATA_DIR || path.join(SERVER_ROOT, 'data'));

const sessionSecret = process.env.SESSION_SECRET || (isProd ? null : 'dev-only-secret-change-me');
if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set in production');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 3000,
  dataDir,
  dbPath: path.join(dataDir, 'shuka.db'),
  uploadsDir: path.join(dataDir, 'uploads'),
  backupsDir: path.join(dataDir, 'backups'),
  migrationsDir: path.join(SERVER_ROOT, 'migrations'),
  clientDist: path.resolve(SERVER_ROOT, '..', 'client', 'dist'),
  sessionSecret,
  sessionDays: 30,
  // Fill an empty database with demo data on start (needed on hosts without a disk).
  seedOnStart: process.env.SEED_ON_START === 'true',
  // Allowed browser origins for CORS when the frontend is not proxied (comma separated).
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
  backupKeep: 7,
};
