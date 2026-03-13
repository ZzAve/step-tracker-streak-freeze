const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

/**
 * Creates all required database tables if they do not already exist.
 * Safe to call on every cold start — uses IF NOT EXISTS guards.
 */
async function initializeDatabase() {
  // Users table: one row per Garmin-connected user
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                SERIAL PRIMARY KEY,
      garmin_user_id    VARCHAR UNIQUE NOT NULL,
      oauth_token       TEXT,
      oauth_token_secret TEXT,
      created_at        TIMESTAMP DEFAULT NOW(),
      last_synced_at    TIMESTAMP
    )
  `;

  // Daily step counts synced from Garmin
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

  // Per-user streak state (one row per user, upserted on sync)
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
}

module.exports = { sql, initializeDatabase };
