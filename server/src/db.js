import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

/**
 * Open a connection with the settings the brief requires on EVERY connection:
 * foreign keys on, WAL mode, and a busy timeout so concurrent writers wait
 * instead of failing with SQLITE_BUSY ("database is locked").
 */
export function openDb(file = config.dbPath) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  if (db.pragma('foreign_keys', { simple: true }) !== 1) {
    throw new Error('Could not enable foreign keys');
  }
  // SQLite's lower() only handles ASCII; this one also lowercases Armenian for search.
  db.function('ulower', { deterministic: true }, (s) => (s == null ? null : String(s).toLowerCase()));
  return db;
}

/** Apply numbered .sql files from /migrations that are newer than PRAGMA user_version. */
export function migrate(db, dir = config.migrationsDir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const current = db.pragma('user_version', { simple: true });
  const applied = [];
  for (const file of files) {
    const version = parseInt(file, 10);
    if (version <= current) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.pragma(`user_version = ${version}`);
    }).immediate();
    applied.push(file);
  }
  return applied;
}

let shared;
/** The single shared connection used by the server process. */
export function getDb() {
  if (!shared) {
    shared = openDb();
    migrate(shared);
  }
  return shared;
}

/** ISO-8601 timestamp in the same format the schema defaults use. */
export const nowIso = () => new Date().toISOString();
