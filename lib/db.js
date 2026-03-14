const { neon, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

let connectionString = process.env.DATABASE_URL;

// Configure for local development with Docker Postgres + neon-proxy
if (process.env.NODE_ENV === 'development') {
  connectionString = 'postgres://postgres:postgres@db.localtest.me:5432/main';
  neonConfig.fetchEndpoint = (host) => {
    const [protocol, port] = host === 'db.localtest.me' ? ['http', 4444] : ['https', 443];
    return `${protocol}://${host}:${port}/sql`;
  };
  const connectionStringUrl = new URL(connectionString);
  neonConfig.useSecureWebSocket = connectionStringUrl.hostname !== 'db.localtest.me';
  neonConfig.wsProxy = (host) => (host === 'db.localtest.me' ? `${host}:4444/v2` : `${host}/v2`);
}
neonConfig.webSocketConstructor = ws;

const sql = neon(connectionString);

/**
 * Creates all required database tables if they do not already exist.
 * Safe to call on every cold start — uses IF NOT EXISTS guards.
 */
async function initializeDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      garmin_user_id    VARCHAR UNIQUE NOT NULL,
      garmin_tokens     JSONB,
      api_key           VARCHAR(64) UNIQUE,
      created_at        TIMESTAMP DEFAULT NOW(),
      last_synced_at    TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_steps (
      id         SERIAL PRIMARY KEY,
      user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       DATE NOT NULL,
      steps      INT NOT NULL,
      goal_met   BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(user_id, date)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS streaks (
      id                          SERIAL PRIMARY KEY,
      user_id                     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      current_streak              INT NOT NULL DEFAULT 0,
      longest_streak              INT NOT NULL DEFAULT 0,
      freeze_count                INT NOT NULL DEFAULT 0,
      days_since_last_freeze_earned INT NOT NULL DEFAULT 0,
      updated_at                  TIMESTAMP DEFAULT NOW()
    )
  `;
  // Migration: add api_key column if it doesn't exist
  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE
  `;
}

module.exports = { sql, initializeDatabase };
