import { openDb, migrate } from '../src/db.js';
import { config } from '../src/config.js';

const db = openDb();
const applied = migrate(db);
console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database is up to date');
console.log(`Schema version ${db.pragma('user_version', { simple: true })} — ${config.dbPath}`);
db.close();
