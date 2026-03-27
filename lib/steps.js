'use strict';

const { sql } = require('./db');
const { calculateStreak } = require('./streak');

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
 * Fetch all daily_steps for a user, normalize dates, and calculate streak.
 * @param {string} userId
 * @returns {Promise<{allSteps: Array<{date: string, steps: number, goal_met: boolean}>, streak: object}>}
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
  const streak = calculateStreak(allSteps, null);
  return { allSteps, streak };
}

module.exports = { formatDateStr, fetchStepsAndStreak };
