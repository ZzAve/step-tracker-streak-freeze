'use strict';

const crypto = require('crypto');
const { sql, initializeDatabase } = require('../lib/db');
const { calculateStreak, STEP_GOAL } = require('../lib/streak');
const { syncIfNeeded, todayStr } = require('../lib/sync');
const { createRequestLogger } = require('../lib/request-logger');

const MILESTONES = [5, 10, 25, 50, 100];

module.exports = async (req, res) => {
  const { log, logResponse } = createRequestLogger(req);
  log.debug({ query: req.query }, 'Request received');
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }

  try {
    await initializeDatabase();

    // --- API key auth (hash-based lookup) ---
    const apiKey = req.query.key;
    if (!apiKey) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyResult = await sql`
      SELECT ak.id AS key_id, ak.expires_at, u.id, u.garmin_tokens, u.last_synced_at
      FROM api_keys ak
      JOIN users u ON u.id = ak.user_id
      WHERE ak.key_hash = ${keyHash}
    `;
    if (keyResult.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const keyRow = keyResult[0];

    // Check expiration
    if (new Date(keyRow.expires_at) < new Date()) {
      res.status(401).json({ error: 'API key expired' });
      return;
    }

    // Update last_used_at
    await sql`UPDATE api_keys SET last_used_at = now() WHERE id = ${keyRow.key_id}`;

    const user = { id: keyRow.id, garmin_tokens: keyRow.garmin_tokens, last_synced_at: keyRow.last_synced_at };

    // --- Sync if needed (non-fatal — serve stale data on failure) ---
    log.debug({ userId: user.id, last_synced_at: user.last_synced_at }, 'Checking sync');
    const didSync = await syncIfNeeded(user, { fatalOnMissingTokens: false, fatalOnSyncError: false });
    log.debug('syncIfNeeded result: %s', didSync ? 'SYNCED' : 'SKIPPED (cooldown or no tokens)');

    // --- Fetch steps & calculate streak ---
    log.debug('Fetching all step data for user %s', user.id);
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

    log.debug('Found %d step records in DB', allSteps.length);

    const streak = calculateStreak(allSteps, null);
    log.debug({ current: streak.current_streak, longest: streak.longest_streak, freezes: streak.freeze_count }, 'Streak result');

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

    // --- Today's steps ---
    const today = todayStr();
    const todayEntry = allSteps.find((s) => s.date === today);
    const todaySteps = todayEntry ? todayEntry.steps : null;

    // --- Week array (past 6 days + today) ---
    const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLetter = dayLetters[d.getDay()];

      if (i === 0) {
        // Today is always pending
        week.push({ day: dayLetter, status: 'pending' });
      } else {
        const annotation = streak.day_annotations.find((a) => a.date === dateStr);
        week.push({ day: dayLetter, status: annotation ? annotation.status : 'not_met' });
      }
    }

    // --- Compact response ---
    log.debug({ streak: streak.current_streak, todaySteps, nextMilestone }, 'Responding');
    res.status(200).json({
      streak: streak.current_streak,
      longest: streak.longest_streak,
      freezes: streak.freeze_count,
      next_milestone: nextMilestone,
      days_to_milestone: daysToMilestone,
      today_steps: todaySteps,
      step_goal: STEP_GOAL,
      week: week,
    });
    logResponse(res);
  } catch (err) {
    log.error(err, 'Error in /api/widget');
    res.status(500).json({ error: 'Internal server error' });
    logResponse(res);
  }
};
