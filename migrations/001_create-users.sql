-- Up Migration
CREATE TABLE IF NOT EXISTS users (
  id                SERIAL PRIMARY KEY,
  garmin_user_id    VARCHAR UNIQUE NOT NULL,
  garmin_tokens     JSONB,
  created_at        TIMESTAMP DEFAULT NOW(),
  last_synced_at    TIMESTAMP
);

-- Down Migration
DROP TABLE users;
