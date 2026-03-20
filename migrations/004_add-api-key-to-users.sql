-- Up Migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE;

-- Down Migration
ALTER TABLE users DROP COLUMN api_key;
