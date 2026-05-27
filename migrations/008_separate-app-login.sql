-- Up Migration
-- Add email column (copy from garmin_user_id for existing users), make garmin_user_id nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR;
UPDATE users SET email = garmin_user_id WHERE email IS NULL AND garmin_user_id IS NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
-- Add unique constraint on email (only after populating it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END$$;
-- Make garmin_user_id nullable (it was NOT NULL before)
ALTER TABLE users ALTER COLUMN garmin_user_id DROP NOT NULL;

-- Down Migration
-- ALTER TABLE users ALTER COLUMN garmin_user_id SET NOT NULL;
-- ALTER TABLE users DROP COLUMN IF EXISTS email;
-- ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
