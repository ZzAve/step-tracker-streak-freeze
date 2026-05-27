-- Up Migration
ALTER TABLE streaks
  ADD COLUMN freezes_used JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN last_processed_date DATE;

-- Down Migration
ALTER TABLE streaks
  DROP COLUMN freezes_used,
  DROP COLUMN last_processed_date;
