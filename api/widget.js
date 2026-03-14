'use strict';

const { sql, initializeDatabase } = require('../lib/db');
const { fetchDailySteps } = require('../lib/garmin');
const { calculateStreak, STEP_GOAL } = require('../lib/streak');

const MILESTONES = [5, 10, 25, 50, 100];
const SYNC_COOLDOWN_MS = 60 * 60 * 1000;

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

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }

  try {
    await initializeDatabase();

    // --- API key auth ---
    const apiKey = req.query.key;
    if (!apiKey) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const userResult = await sql`
      SELECT id, garmin_tokens, last_synced_at
      FROM users
      WHERE api_key = ${apiKey}
    `;
    if (userResult.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    const user = userResult[0];

    // --- Sync if needed (same logic as /api/steps) ---
    const now = Date.now();
    const lastSynced = user.last_synced_at ? new Date(user.last_synced_at).getTime() : 0;
    const needsSync = now - lastSynced >= SYNC_COOLDOWN_MS;

    if (needsSync && user.garmin_tokens) {
      const existingResult = await sql`
        SELECT date FROM daily_steps WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 1
      `;
      const hasExistingData = existingResult.length > 0;
      let startDate;
      if (!hasExistingData) {
        startDate = daysAgoDateStr(60);
      } else {
        const dateObj = new Date(existingResult[0].date);
        startDate = dateObj.toISOString().slice(0, 10);
      }
      const endDate = todayStr();

      try {
        const stepRecords = await fetchDailySteps(user.garmin_tokens, startDate, endDate);
        for (const record of stepRecords) {
          const goalMet = record.steps >= STEP_GOAL;
          await sql`
            INSERT INTO daily_steps (user_id, date, steps, goal_met)
            VALUES (${user.id}, ${record.date}, ${record.steps}, ${goalMet})
            ON CONFLICT (user_id, date)
            DO UPDATE SET steps = EXCLUDED.steps, goal_met = EXCLUDED.goal_met
          `;
        }
        await sql`UPDATE users SET last_synced_at = NOW() WHERE id = ${user.id}`;
      } catch (err) {
        // Sync failure is non-fatal for widget — we'll use stale data
        console.error('Widget sync error:', err.message);
      }
    }

    // --- Fetch steps & calculate streak ---
    const stepsResult = await sql`
      SELECT date, steps, goal_met
      FROM daily_steps
      WHERE user_id = ${user.id}
      ORDER BY date ASC
    `;
    const allSteps = stepsResult.map((row) => ({
      date: row.date instanceof Date
        ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
        : String(row.date).slice(0, 10),
      steps: row.steps,
      goal_met: row.goal_met,
    }));

    const streak = calculateStreak(allSteps, null);

    // --- Compute milestone info ---
    let nextMilestone = null;
    let daysToMilestone = null;
    for (const ms of MILESTONES) {
      if (streak.current_streak < ms) {
        nextMilestone = ms;
        daysToMilestone = ms - streak.current_streak;
        break;
      }
    }

    // --- Compact response ---
    res.status(200).json({
      streak: streak.current_streak,
      longest: streak.longest_streak,
      freezes: streak.freeze_count,
      next_milestone: nextMilestone,
      days_to_milestone: daysToMilestone,
    });
  } catch (err) {
    console.error('Error in /api/widget:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
