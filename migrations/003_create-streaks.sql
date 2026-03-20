-- Up Migration
CREATE TABLE IF NOT EXISTS streaks (
  id                            SERIAL PRIMARY KEY,
  user_id                       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  current_streak                INT NOT NULL DEFAULT 0,
  longest_streak                INT NOT NULL DEFAULT 0,
  freeze_count                  INT NOT NULL DEFAULT 0,
  days_since_last_freeze_earned INT NOT NULL DEFAULT 0,
  updated_at                    TIMESTAMP DEFAULT NOW()
);

-- Down Migration
DROP TABLE streaks;
