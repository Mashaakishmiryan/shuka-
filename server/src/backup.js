import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

/**
 * Copy the live database with VACUUM INTO (safe while the server is running)
 * into DATA_DIR/backups/shuka-YYYY-MM-DD.db, keeping the newest `config.backupKeep`.
 */
export function backupDatabase(db) {
  fs.mkdirSync(config.backupsDir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const target = path.join(config.backupsDir, `shuka-${day}.db`);
  fs.rmSync(target, { force: true });
  db.prepare('VACUUM INTO ?').run(target);

  const old = fs.readdirSync(config.backupsDir).filter((f) => /^shuka-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse();
  for (const f of old.slice(config.backupKeep)) fs.rmSync(path.join(config.backupsDir, f), { force: true });
  return target;
}

/** Back up once now if today's backup is missing, then every 24 hours. */
export function scheduleDailyBackup(db) {
  const run = () => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      if (!fs.existsSync(path.join(config.backupsDir, `shuka-${day}.db`))) {
        console.log(`Backup written: ${backupDatabase(db)}`);
      }
    } catch (e) {
      console.error('Backup failed:', e.message);
    }
  };
  run();
  const timer = setInterval(run, 60 * 60 * 1000); // check hourly, write once per day
  timer.unref();
}
