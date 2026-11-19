import { openDb } from '../src/db.js';
import { backupDatabase } from '../src/backup.js';

const db = openDb();
console.log(`Backup written: ${backupDatabase(db)}`);
db.close();
