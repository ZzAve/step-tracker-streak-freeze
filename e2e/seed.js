const crypto = require('crypto');
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

// Provision an API key for a registered user directly in the DB, given a
// plaintext the test already knows. Mirrors api/apikey.js: sha256(plaintext) ->
// key_hash, first 8 chars -> prefix. There is no test-only minting endpoint
// path needed here — the widget only ever sees the hash. `daysToExpiry`
// negative yields an already-expired key for the 401 path. Each test mints its
// own unique plaintext, so the UNIQUE(key_hash) rows never collide in parallel.
async function seedApiKey(email, plaintextKey, { daysToExpiry = 365 } = {}) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      throw new Error(`[e2e seed] no user found for email ${email} — register before seeding`);
    }
    const userId = userRes.rows[0].id;

    const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');
    const prefix = plaintextKey.slice(0, 8);
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + daysToExpiry);

    await client.query(
      `INSERT INTO api_keys (user_id, name, key_hash, prefix, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, 'e2e', keyHash, prefix, now.toISOString(), expiresAt.toISOString()]
    );
    return userId;
  } finally {
    await client.end().catch(() => {});
  }
}

// Provision a password-reset token for a registered user directly in the DB,
// given a plaintext the test already knows. Mirrors api/auth/forgot-password.js:
// sha256(plaintext) -> token_hash, 1h expiry. The endpoint stores only the hash
// (the plaintext leaves only by email), so a test cannot read a real token back —
// it seeds a known one and drives the real reset endpoint with it. A past
// `expiresInMs` yields the expired fixture; a `usedAt` timestamp yields the
// already-used fixture. Each test mints its own unique plaintext, so rows never
// collide across parallel workers.
async function seedResetToken(email, plaintextToken, { expiresInMs = 3600000, usedAt = null } = {}) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rows.length === 0) {
      throw new Error(`[e2e seed] no user found for email ${email} — register before seeding`);
    }
    const userId = userRes.rows[0].id;

    const tokenHash = crypto.createHash('sha256').update(plaintextToken).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInMs);

    await client.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, tokenHash, expiresAt.toISOString(), usedAt]
    );
    return userId;
  } finally {
    await client.end().catch(() => {});
  }
}

// Count a user's unused reset tokens, resolved by lowercased email. Lets the
// request-side tests assert the anti-enumeration difference that matters: a row
// created for a registered user, none for an unregistered email (returns 0 when
// no such user exists). Test-only; parallel-safe per the unique-user isolation.
async function countResetTokens(email) {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();

    const res = await client.query(
      `SELECT COUNT(*)::int AS n
       FROM password_reset_tokens t
       JOIN users u ON u.id = t.user_id
       WHERE u.email = $1 AND t.used_at IS NULL`,
      [email.toLowerCase()]
    );
    return res.rows[0].n;
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
  seedApiKey,
  seedResetToken,
  countResetTokens,
};
