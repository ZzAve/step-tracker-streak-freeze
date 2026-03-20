-- Up Migration
CREATE TABLE IF NOT EXISTS daily_steps (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  steps      INT NOT NULL,
  goal_met   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, date)
);

-- Down Migration
DROP TABLE daily_steps;
