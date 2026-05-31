const { Client } = require('pg');
const { DATABASE_URL, SESSION_SECRET } = require('./env');

// Runs once before the suite: fail fast if the local database is missing, then
// apply production migrations so the schema under test matches production.
module.exports = async function globalSetup() {
  process.env.DATABASE_URL = DATABASE_URL;
  process.env.SESSION_SECRET = SESSION_SECRET;

  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } catch (err) {
    throw new Error(
      `\n[e2e] Cannot reach the local Postgres at ${DATABASE_URL}\n` +
        `Start the database stack first:\n\n` +
        `    docker compose up -d\n\n` +
        `(brings up the Postgres + Neon-proxy services from docker-compose.yml)\n` +
        `Underlying error: ${err.message}\n`
    );
  } finally {
    await client.end().catch(() => {});
  }

  // Apply migrations via the app's own idempotent migration runner.
  const { initializeDatabase } = require('../lib/db');
  await initializeDatabase();
};
