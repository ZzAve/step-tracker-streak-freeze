'use strict';

const { sql } = require('./db');
const { fetchDailySteps } = require('./garmin');
const { calculateStreak, applyIncrementalDays, todayStr, STEP_GOAL } = require('./streak');
const { upsertStreakResult, formatDateStr } = require('./steps');
const logger = require('./logger');
const { encryptTokens, decryptTokens } = require('./token-crypto');

const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HISTORICAL_DAYS = 60;

function daysAgoDateStr(daysAgo) {
  const d = new Date();
  d.setUTCHours(12);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

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

/**
 * Compute and persist the streak after a sync.
 *
 * Attempts an incremental update when all newly-upserted records are forward-
 * only (date > last_processed_date). Falls back to a full recalculation when:
 *  - No persisted streak row exists yet
 *  - Any upserted record has a date ≤ last_processed_date (historical backfill)
 *  - applyIncrementalDays returns { safe: false }
 *
 * @param {string|number} userId
 * @param {Array<{date: string, steps: number}>} stepRecords  Freshly upserted records from Garmin.
 */
async function computeAndPersistStreak(userId, stepRecords) {
  const today = todayStr();

  // Fetch all daily_steps for the user (needed for full recalc fallback and lastProcessedDate).
  const allStepsRaw = await sql`
    SELECT date, steps, goal_met
    FROM daily_steps
    WHERE user_id = ${userId}
    ORDER BY date ASC
  `;
  const allSteps = allStepsRaw.map((r) => ({
    date: formatDateStr(r.date),
    steps: r.steps,
    goal_met: r.goal_met,
  }));

  const pastSteps = allSteps.filter((s) => s.date < today);

  // Attempt incremental update if we have a persisted state.
  const streakRows = await sql`
    SELECT current_streak, longest_streak, freeze_count, days_since_last_freeze_earned,
           freezes_used, last_processed_date
    FROM streaks
    WHERE user_id = ${userId}
  `;

  if (streakRows.length > 0 && streakRows[0].last_processed_date) {
    const storedLastDate = formatDateStr(streakRows[0].last_processed_date);

    // If any upserted record has a past date ≤ storedLastDate, historical data
    // may have changed — full recalc is required.
    const hasHistoricalUpdate = stepRecords.some((r) => {
      const d = typeof r.date === 'string' ? r.date.slice(0, 10) : formatDateStr(r.date);
      return d < today && d <= storedLastDate;
    });

    if (!hasHistoricalUpdate) {
      const persistedState = {
        current_streak: streakRows[0].current_streak,
        longest_streak: streakRows[0].longest_streak,
        freeze_count: streakRows[0].freeze_count,
        days_since_last_freeze_earned: streakRows[0].days_since_last_freeze_earned,
        freezes_used: streakRows[0].freezes_used || [],
        last_processed_date: storedLastDate,
      };

      const newPastDays = pastSteps.filter((s) => s.date > storedLastDate);
      const { safe, result } = applyIncrementalDays(persistedState, newPastDays);

      if (safe) {
        const lastProcessedDate = result.last_processed_date || storedLastDate;
        await upsertStreakResult(userId, result, lastProcessedDate);
        logger.debug('Persisted incremental streak for user %s (last_processed_date=%s)', userId, lastProcessedDate);
        return;
      }
    }
  }

  // Full recalculation.
  const streakResult = calculateStreak(allSteps, null);
  const lastProcessedDate = pastSteps.length > 0 ? pastSteps[pastSteps.length - 1].date : null;
  await upsertStreakResult(userId, streakResult, lastProcessedDate);
  logger.debug('Persisted full-recalc streak for user %s (last_processed_date=%s)', userId, lastProcessedDate);
}

/**
 * Sync step data from Garmin if the cooldown has elapsed.
 *
 * @param {object} user - User row with id, garmin_tokens, last_synced_at
 * @param {object} [options]
 * @param {boolean} [options.fatalOnMissingTokens=true] - If true, throws when garmin_tokens is missing
 * @param {boolean} [options.fatalOnSyncError=true] - If true, rethrows Garmin fetch errors
 * @returns {Promise<boolean>} Whether a sync was performed
 */
async function syncIfNeeded(user, options = {}) {
  const { fatalOnMissingTokens = true, fatalOnSyncError = true } = options;

  const now = Date.now();
  logger.debug('last_synced_at %o', { raw: user.last_synced_at, parsed: new Date(user.last_synced_at) });
  const lastSynced = user.last_synced_at ? new Date(user.last_synced_at).getTime() : 0;
  const needsSync = now - lastSynced >= SYNC_COOLDOWN_MS;

  logger.debug('cooldown check %o', { now, lastSynced, elapsed: now - lastSynced, threshold: SYNC_COOLDOWN_MS });
  if (!needsSync) {
    logger.debug('Skipping sync — cooldown not elapsed (%d ms remaining)', SYNC_COOLDOWN_MS - (now - lastSynced));
    return false;
  }

  if (!user.garmin_tokens) {
    if (fatalOnMissingTokens) {
      const err = new Error('No Garmin tokens found for user');
      err.code = 'NO_TOKENS';
      throw err;
    }
    return false;
  }

  logger.info('Syncing steps for user %s', user.id);

  const existingResult = await sql`
    SELECT date FROM daily_steps WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 1
  `;
  const hasExistingData = existingResult.length > 0;

  let startDate;
  if (!hasExistingData) {
    startDate = daysAgoDateStr(HISTORICAL_DAYS);
  } else {
    const dateObj = new Date(existingResult[0].date);
    startDate = dateObj.toISOString().slice(0, 10);
  }
  const endDate = todayStr();

  logger.info('Updating steps for user %s from %s to %s', user.id, startDate, endDate);

  try {
    const { steps: stepRecords, updatedTokens } = await fetchDailySteps(decryptTokens(user.garmin_tokens), startDate, endDate);
    logger.debug('Fetched %d step records from Garmin', stepRecords.length);
    await upsertSteps(user.id, stepRecords);
    await sql`UPDATE users SET garmin_tokens = ${encryptTokens(updatedTokens)}, last_synced_at = NOW() WHERE id = ${user.id}`;
    logger.debug('Upserted steps and updated last_synced_at + garmin_tokens for user %s', user.id);

    await computeAndPersistStreak(user.id, stepRecords);
  } catch (err) {
    if (fatalOnSyncError) {
      throw err;
    }
    logger.error('Sync error (non-fatal): %s', err.message);
    return false;
  }

  return true;
}

module.exports = { syncIfNeeded, todayStr, SYNC_COOLDOWN_MS };
