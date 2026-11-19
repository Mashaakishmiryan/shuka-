import { config } from './config.js';
import { getDb } from './db.js';
import { createApp } from './app.js';
import { scheduleDailyBackup } from './backup.js';
import { seedDatabase, isEmpty } from './seed.js';

const db = getDb(); // opens the file and applies pending migrations

if (config.seedOnStart && isEmpty(db)) {
  console.log('Empty database — loading demo data…');
  await seedDatabase(db);
}

scheduleDailyBackup(db);

const server = createApp().listen(config.port, () => {
  console.log(`Shuka API on http://localhost:${config.port}  (data: ${config.dataDir})`);
});

const shutdown = () => {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
