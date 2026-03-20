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
const { calculateStreak } = require('../lib/streak');
const { syncIfNeeded } = require('../lib/sync');
const { createRequestLogger } = require('../lib/request-logger');

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);

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
      SELECT id, garmin_user_id, garmin_tokens, last_synced_at
      FROM users
      WHERE id = ${userId}
    `;
    if (userResult.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    const user = userResult[0];

    // --- Sync if needed ---
    try {
      await syncIfNeeded(user, { fatalOnMissingTokens: true, fatalOnSyncError: true });
    } catch (err) {
      if (err.code === 'NO_TOKENS') {
        res.status(400).json({ error: 'No Garmin tokens found for user' });
        return;
      }
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        res.status(401).json({ error: 'Garmin token expired, please log in again' });
        return;
      }
      throw err;
    }

    // --- Fetch all step data for this user ---
    const stepsResult = await sql`
      SELECT date, steps, goal_met
      FROM daily_steps
      WHERE user_id = ${user.id}
      ORDER BY date ASC
    `;
    const allSteps = stepsResult.map((row) => {
      return ({
        date: row.date instanceof Date
            ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
            : String(row.date).slice(0, 10),
        steps: row.steps,
        goal_met: row.goal_met,
      });
    });

    // --- Calculate streak ---
    const streakResult = calculateStreak(allSteps, null);

    // --- Upsert streaks table (fire-and-forget, don't block response) ---
    sql`
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
    `.catch(err => log.error(err, 'Failed to upsert streak'));

    // --- Build response ---
    const lastSyncedAt = user.last_synced_at ?? null;
    res.status(200).json({
      user_email: user.garmin_user_id || null,
      streak: {
        current: streakResult.current_streak,
        longest: streakResult.longest_streak,
        freeze_count: streakResult.freeze_count,
        days_toward_next_freeze: streakResult.days_since_last_freeze_earned,
        freezes_used: streakResult.freezes_used.map(f => f.date),
      },
      steps: allSteps,
      last_synced_at: lastSyncedAt,
    });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Error in /api/steps');
    res.status(500).json({ error: 'Internal server error' });
    logResponse(res);
  }
};
