'use strict';

const { sql } = require('./db');
const { calculateStreak, applyIncrementalDays, extendStreakWithToday, todayStr, STEP_GOAL } = require('./streak');
const logger = require('./logger');

/**
 * Normalize a Date object or date string to a YYYY-MM-DD string.
 * @param {Date|string} dateValue
 * @returns {string}
 */
function formatDateStr(dateValue) {
  if (dateValue instanceof Date) {
    return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
  }
  return String(dateValue).slice(0, 10);
}

/**
 * Persist computed streak state to the streaks table.
 * @param {string|number} userId
 * @param {{ current_streak, longest_streak, freeze_count, days_since_last_freeze_earned, freezes_used }} streakResult
 * @param {string|null} lastProcessedDate  YYYY-MM-DD of the latest daily_steps row included in the calc
 */
async function upsertStreakResult(userId, streakResult, lastProcessedDate) {
  await sql`
    INSERT INTO streaks (user_id, current_streak, longest_streak, freeze_count, days_since_last_freeze_earned, freezes_used, last_processed_date, updated_at)
    VALUES (
      ${userId},
      ${streakResult.current_streak},
      ${streakResult.longest_streak},
      ${streakResult.freeze_count},
      ${streakResult.days_since_last_freeze_earned},
      ${JSON.stringify(streakResult.freezes_used || [])},
      ${lastProcessedDate || null},
      NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
      current_streak                = EXCLUDED.current_streak,
      longest_streak                = EXCLUDED.longest_streak,
      freeze_count                  = EXCLUDED.freeze_count,
      days_since_last_freeze_earned = EXCLUDED.days_since_last_freeze_earned,
      freezes_used                  = EXCLUDED.freezes_used,
      last_processed_date           = EXCLUDED.last_processed_date,
      updated_at                    = NOW()
  `;
}

/**
 * Derive per-day annotations from allSteps + the set of freeze-used dates.
 * This reconstructs what calculateStreak returns as day_annotations without
 * replaying the full algorithm.
 *
 * @param {Array<{date, steps, goal_met}>} allSteps  All past daily_steps (before today).
 * @param {Array<{date: string}>} freezesUsed
 * @param {string} todayStr
 * @returns {Array<{date: string, status: string}>}
 */
function buildDayAnnotations(allSteps, freezesUsed, todayStr) {
  const freezeDates = new Set(freezesUsed.map((f) => f.date));
  return allSteps
    .filter((s) => s.date < todayStr)
    .map((s) => {
      // Mirror calculateStreak's hit condition: a day counts when goal_met is
      // recorded OR the raw step count meets the goal. Keeping these in sync
      // prevents the reconstructed annotations from drifting from a full recalc.
      const hit = s.goal_met === true || s.steps >= STEP_GOAL;
      return {
        date: s.date,
        status: hit ? 'hit' : freezeDates.has(s.date) ? 'freeze' : 'not_met',
      };
    });
}

/**
 * Fetch all daily_steps for a user, normalize dates, and return the streak.
 *
 * Phase 1+2 behaviour:
 *  - If a persisted `streaks` row exists and all past daily_steps are already
 *    accounted for (last_processed_date >= yesterday), return the cached streak
 *    with day_annotations reconstructed from allSteps + freezes_used.
 *  - If unprocessed past days exist (day-rollover), apply an incremental update
 *    (or full recalc fallback) and persist the result asynchronously.
 *  - If no persisted row exists, fall back to calculateStreak().
 *
 * @param {string} userId
 * @returns {Promise<{allSteps: Array, streak: object}>}
 */
async function fetchStepsAndStreak(userId) {
  const stepsResult = await sql`
    SELECT date, steps, goal_met
    FROM daily_steps
    WHERE user_id = ${userId}
    ORDER BY date ASC
  `;
  const allSteps = stepsResult.map((row) => ({
    date: formatDateStr(row.date),
    steps: row.steps,
    goal_met: row.goal_met,
  }));

  const today = todayStr();

  // Try to read persisted streak.
  const streakRows = await sql`
    SELECT current_streak, longest_streak, freeze_count, days_since_last_freeze_earned,
           freezes_used, last_processed_date
    FROM streaks
    WHERE user_id = ${userId}
  `;

  if (streakRows.length > 0) {
    const row = streakRows[0];
    const lastProcessed = row.last_processed_date ? formatDateStr(row.last_processed_date) : null;

    // Unprocessed past days = daily_steps rows that are newer than what we last
    // computed but already in the past (yesterday or earlier). When the row has
    // no last_processed_date yet (e.g. a user whose streaks row predates the
    // persistence migration), treat every past day as unprocessed so the path
    // below recomputes and persists, letting the row self-heal instead of
    // staying on the recalc-without-persist fallback forever.
    const unprocessedDays = lastProcessed
      ? allSteps.filter((s) => s.date > lastProcessed && s.date < today)
      : allSteps.filter((s) => s.date < today);

    if (lastProcessed && unprocessedDays.length === 0) {
      // Cached state is current — reconstruct day_annotations and return.
      const freezesUsed = row.freezes_used || [];
      const baseStreak = {
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        freeze_count: row.freeze_count,
        days_since_last_freeze_earned: row.days_since_last_freeze_earned,
        freezes_used: freezesUsed,
        day_annotations: buildDayAnnotations(allSteps, freezesUsed, today),
      };
      return {
        allSteps,
        streak: extendStreakWithToday(baseStreak, allSteps, today),
      };
    }

    if (unprocessedDays.length > 0) {
      // Day-rollover: apply incremental update.
      const persistedState = {
        current_streak: row.current_streak,
        longest_streak: row.longest_streak,
        freeze_count: row.freeze_count,
        days_since_last_freeze_earned: row.days_since_last_freeze_earned,
        freezes_used: row.freezes_used || [],
        last_processed_date: lastProcessed,
      };

      const { safe, result } = applyIncrementalDays(persistedState, unprocessedDays);

      let streakResult;
      let newLastProcessed;

      if (safe) {
        newLastProcessed = result.last_processed_date;
        streakResult = {
          ...result,
          day_annotations: buildDayAnnotations(allSteps, result.freezes_used, today),
        };
      } else {
        // Fall back to full recalc.
        streakResult = calculateStreak(allSteps, null);
        const pastDays = allSteps.filter((s) => s.date < today);
        newLastProcessed = pastDays.length > 0 ? pastDays[pastDays.length - 1].date : null;
      }

      // Persist the base streak without today — today isn't finished yet.
      upsertStreakResult(userId, streakResult, newLastProcessed).catch((err) =>
        logger.error('Failed to persist rolled-over streak for user %s: %s', userId, err.message)
      );

      return { allSteps, streak: extendStreakWithToday(streakResult, allSteps, today) };
    }
  }

  // No persisted streak, or a persisted row with no past days to process yet.
  // Full recalc — sync will persist the result on the next trigger.
  const streak = calculateStreak(allSteps, null);
  return { allSteps, streak: extendStreakWithToday(streak, allSteps, today) };
}

module.exports = { formatDateStr, fetchStepsAndStreak, upsertStreakResult, buildDayAnnotations };
