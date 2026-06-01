const { Client } = require('pg');
const { DATABASE_URL } = require('./env');

// Test-only step seeding. There is no public endpoint to set step counts (steps
// only arrive via Garmin sync), and a freshly-registered e2e user has no Garmin
// tokens, so lib/sync.js short-circuits before any network call. That lets us
// drive the dashboard deterministically by writing daily_steps directly to the
// same local Postgres the app reads from — proving the real schema and the real
// api/steps -> lib/streak path agree.

const STEP_GOAL = 10000; // mirrors lib/streak.js

// Local-date string (YYYY-MM-DD). Both lib/streak.js and the frontend compute
// "today" from local getFullYear/getMonth/getDate, so seed dates must too.
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Date string N days before today (N=0 -> today, N=1 -> yesterday).
function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

// Build a run of `count` consecutive goal-met days ending yesterday.
// The streak engine excludes today, so a run ending yesterday yields
// current_streak === count for count < 5 (no freeze earned yet).
function consecutiveGoalMetEndingYesterday(count, steps = 12000) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({ date: dateStrDaysAgo(i), steps, goalMet: true });
  }
  return rows;
}

// Resolve a registered user's id by email, then upsert daily_steps rows.
// rows: [{ date: 'YYYY-MM-DD', steps: number, goalMet?: boolean }]
// goalMet defaults to steps >= STEP_GOAL (matching lib/sync.js).
async function seedDailySteps(email, rows) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      throw new Error(`[e2e seed] no user found for email ${email} — register before seeding`);
    }
    const userId = userRes.rows[0].id;

    for (const row of rows) {
      const goalMet = row.goalMet ?? row.steps >= STEP_GOAL;
      // Idempotent per (user_id, date), matching lib/sync.js upsertSteps.
      await client.query(
        `INSERT INTO daily_steps (user_id, date, steps, goal_met)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, date)
         DO UPDATE SET steps = EXCLUDED.steps, goal_met = EXCLUDED.goal_met`,
        [userId, row.date, row.steps, goalMet]
      );
    }
    return userId;
  } finally {
    await client.end().catch(() => {});
  }
}

module.exports = {
  STEP_GOAL,
  ymd,
  dateStrDaysAgo,
  consecutiveGoalMetEndingYesterday,
  seedDailySteps,
};
