-- Up Migration
-- Convert garmin_tokens from JSONB to TEXT to support application-layer encrypted storage.
-- Existing plaintext JSON values are preserved as TEXT; the app decrypts/re-encrypts transparently.
ALTER TABLE users ALTER COLUMN garmin_tokens TYPE TEXT USING garmin_tokens::text;

-- Down Migration
-- This migration is irreversible. Encrypted values (enc:v1:...) cannot be cast back to JSONB
-- without the encryption key and application-layer decryption logic.
-- ALTER TABLE users ALTER COLUMN garmin_tokens TYPE JSONB USING garmin_tokens::jsonb;
