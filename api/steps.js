'use strict';

/**
 * GET /api/steps
 *
 * Syncs the authenticated user's step data from Garmin (if needed) and returns
 * their current streak state, step history, and last sync timestamp.
 *
 * Response JSON:
 * {
 *   streak: { current, longest, freeze_count, days_toward_next_freeze },
 *   steps: [{ date, steps, goal_met }],
 *   last_synced_at: string | null
 * }
 */

const { sql, initializeDatabase } = require('../lib/db');
const { getUserFromSession } = require('../lib/session');
const { fetchDailySteps } = require('../lib/garmin');
const { calculateStreak, STEP_GOAL } = require('../lib/streak');

const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HISTORICAL_DAYS = 365;

/**
 * Return a YYYY-MM-DD string for `daysAgo` days before today (UTC).
 * @param {number} daysAgo
 * @returns {string}
 */
function daysAgoDateStr(daysAgo) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Return today's YYYY-MM-DD string (UTC).
 * @returns {string}
 */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Upsert an array of { date, steps } records for the given user.
 * Sets goal_met based on STEP_GOAL.
 * @param {number} userId
 * @param {Array<{date: string, steps: number}>} stepRecords
 */
async function upsertSteps(userId, stepRecords) {
  for (const record of stepRecords) {
    const goalMet = record.steps >= STEP_GOAL;
    await sql`
      INSERT INTO daily_steps (user_id, date, steps, goal_met)
      VALUES (${userId}, ${record.date}, ${record.steps}, ${goalMet})
      ON CONFLICT (user_id, date)
      DO UPDATE SET steps = EXCLUDED.steps, goal_met = EXCLUDED.goal_met
    `;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }
  try {
    await initializeDatabase();

    // --- Authentication ---
    const userId = getUserFromSession(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // --- Load user record ---
    const userResult = await sql`
      SELECT id, oauth_token, oauth_token_secret, last_synced_at
      FROM users
      WHERE id = ${userId}
    `;
    if (userResult.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const user = userResult[0];

    // --- Decide whether to sync ---
    const now = Date.now();
    const lastSynced = user.last_synced_at ? new Date(user.last_synced_at).getTime() : 0;
    const needsSync = now - lastSynced >= SYNC_COOLDOWN_MS;

    if (needsSync) {
      if (!user.oauth_token || !user.oauth_token_secret) {
        res.status(400).json({ error: 'No Garmin OAuth tokens found for user' });
        return;
      }

      // Check whether this user already has any step data
      const existingResult = await sql`
        SELECT date FROM daily_steps WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 1
      `;
      const hasExistingData = existingResult.length > 0;

      let startDate;
      if (!hasExistingData) {
        // Historical import: fetch the past year
        startDate = daysAgoDateStr(HISTORICAL_DAYS);
      } else {
        // Incremental sync: fetch from the most recent synced date
        startDate = existingResult[0].date;
      }
      const endDate = todayStr();

      const stepRecords = await fetchDailySteps(
        user.oauth_token,
        user.oauth_token_secret,
        startDate,
        endDate
      );

      await upsertSteps(user.id, stepRecords);

      // Update last_synced_at
      await sql`
        UPDATE users SET last_synced_at = NOW() WHERE id = ${user.id}
      `;
    }

    // --- Fetch all step data for this user ---
    const stepsResult = await sql`
      SELECT date, steps, goal_met
      FROM daily_steps
      WHERE user_id = ${user.id}
      ORDER BY date ASC
    `;
    const allSteps = stepsResult.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
      steps: row.steps,
      goal_met: row.goal_met,
    }));

    // --- Calculate streak ---
    const streakResult = calculateStreak(allSteps, null);

    // --- Upsert streaks table ---
    await sql`
      INSERT INTO streaks (user_id, current_streak, longest_streak, freeze_count, days_since_last_freeze_earned, updated_at)
      VALUES (
        ${user.id},
        ${streakResult.current_streak},
        ${streakResult.longest_streak},
        ${streakResult.freeze_count},
        ${streakResult.days_since_last_freeze_earned},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        freeze_count = EXCLUDED.freeze_count,
        days_since_last_freeze_earned = EXCLUDED.days_since_last_freeze_earned,
        updated_at = NOW()
    `;

    // --- Fetch updated last_synced_at ---
    const syncedAtResult = await sql`
      SELECT last_synced_at FROM users WHERE id = ${user.id}
    `;
    const lastSyncedAt = syncedAtResult[0]?.last_synced_at ?? null;

    // --- Build response ---
    res.status(200).json({
      streak: {
        current: streakResult.current_streak,
        longest: streakResult.longest_streak,
        freeze_count: streakResult.freeze_count,
        days_toward_next_freeze: streakResult.days_since_last_freeze_earned,
      },
      steps: allSteps,
      last_synced_at: lastSyncedAt,
    });
  } catch (err) {
    console.error('Error in /api/steps:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
