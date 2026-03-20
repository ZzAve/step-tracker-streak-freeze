'use strict';

const { sql } = require('./db');
const { fetchDailySteps } = require('./garmin');
const { STEP_GOAL } = require('./streak');
const logger = require('./logger');

const SYNC_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HISTORICAL_DAYS = 60;

function daysAgoDateStr(daysAgo) {
  const d = new Date();
  d.setUTCHours(12);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  const d = new Date();
  d.setUTCHours(12);
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
  logger.debug({ raw: user.last_synced_at, parsed: new Date(user.last_synced_at) }, 'last_synced_at');
  const lastSynced = user.last_synced_at ? new Date(user.last_synced_at).getTime() : 0;
  const needsSync = now - lastSynced >= SYNC_COOLDOWN_MS;

  logger.debug({ now, lastSynced, elapsed: now - lastSynced, threshold: SYNC_COOLDOWN_MS }, 'cooldown check');
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
    const { steps: stepRecords, updatedTokens } = await fetchDailySteps(user.garmin_tokens, startDate, endDate);
    logger.debug('Fetched %d step records from Garmin', stepRecords.length);
    await upsertSteps(user.id, stepRecords);
    await sql`UPDATE users SET garmin_tokens = ${JSON.stringify(updatedTokens)}, last_synced_at = NOW() WHERE id = ${user.id}`;
    logger.debug('Upserted steps and updated last_synced_at + garmin_tokens for user %s', user.id);
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
