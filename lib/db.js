const { Pool, neonConfig } = require('@neondatabase/serverless');
const path = require('path');
const ws = require('ws');
const logger = require('../lib/logger');

let connectionString = process.env.DATABASE_URL;

// Configure for local development with Docker Postgres + neon-proxy
if (process.env.NODE_ENV === 'development') {
  connectionString = 'postgres://postgres:postgres@db.localtest.me:5432/main';
  neonConfig.useSecureWebSocket = false;
  neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
}
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString });

// Tagged template helper matching the neon() sql`` API
function sql(strings, ...values) {
  const text = strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ''), '');
  return pool.query(text, values).then(r => r.rows);
}

let initPromise = null;
logger.info('Initializing database');

/**
 * Runs pending database migrations via node-pg-migrate.
 * Cached so migrations only execute once per container lifecycle (cold start).
 */
function initializeDatabase() {
  if (!initPromise) {
    initPromise = runMigrations();
  }
  return initPromise;
}

async function runMigrations() {
  const { runner } = await import('node-pg-migrate');
  try {
    await runner({
      databaseUrl: connectionString,
      dir: path.resolve(__dirname, '..', 'migrations'),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      log: () => {},
    });
  } catch (err) {
    if (err.message === 'Another migration is already running') {
      logger.info('Migration lock held by another instance, skipping');
      return;
    }
    throw err;
  }
}

module.exports = { sql, initializeDatabase };
