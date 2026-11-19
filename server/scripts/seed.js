// npm run seed            — fill an empty database with demo data
// npm run seed -- --reset — delete the database and uploads first, then seed
import fs from 'node:fs';
import { config } from '../src/config.js';
import { openDb, migrate } from '../src/db.js';
import { seedDatabase, isEmpty, DEMO_PASSWORD } from '../src/seed.js';

if (process.argv.includes('--reset')) {
  for (const f of [config.dbPath, `${config.dbPath}-wal`, `${config.dbPath}-shm`]) fs.rmSync(f, { force: true });
  fs.rmSync(config.uploadsDir, { recursive: true, force: true });
  console.log('Database and uploads removed.');
}

const db = openDb();
migrate(db);
if (!isEmpty(db)) {
  console.log('Database already has data — use `npm run seed -- --reset` to start over.');
} else {
  await seedDatabase(db);
  console.log(`Demo accounts (password "${DEMO_PASSWORD}"): aram@, ani@, davit@ (sellers), lilit@, narek@ (buyers) — all @shuka.test`);
}
db.close();
