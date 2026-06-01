'use strict';

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Module-level mocks (must be set before requiring sync.js)
// ---------------------------------------------------------------------------

const libDir = path.resolve(__dirname, '.');

// Captured upsert calls.
let capturedUpserts = [];

// Configurable step data and streak rows returned by the mock DB.
let mockDailyStepsRows = [];
let mockStreakRows = [];
let mockGarminSteps = [];
let mockGarminTokens = { access_token: 'new-token' };

// Simple sql tagged-template mock.  Inspects the first template string to
// decide what to return.
const mockSql = (...args) => {
  const query = (args[0]?.[0] || '').replace(/\s+/g, ' ').trim().toUpperCase();

  if (query.startsWith('SELECT DATE FROM DAILY_STEPS')) {
    // "last recorded date" query in syncIfNeeded
    if (mockDailyStepsRows.length === 0) return Promise.resolve([]);
    const sorted = [...mockDailyStepsRows].sort((a, b) => (a.date < b.date ? 1 : -1));
    return Promise.resolve([{ date: sorted[0].date }]);
  }
  if (query.startsWith('INSERT INTO DAILY_STEPS')) {
    return Promise.resolve([]);
  }
  if (query.startsWith('UPDATE USERS')) {
    return Promise.resolve([]);
  }
  if (query.startsWith('SELECT DATE, STEPS, GOAL_MET') || query.startsWith('SELECT DATE,STEPS,GOAL_MET')) {
    return Promise.resolve(mockDailyStepsRows);
  }
  if (query.startsWith('SELECT CURRENT_STREAK') || query.startsWith('SELECT CURRENT_STREAK,')) {
    return Promise.resolve(mockStreakRows);
  }
  // Catch-all for INSERT INTO streaks / upsert.
  if (query.includes('INSERT INTO STREAKS')) {
    // Capture the interpolated values from the tagged template call.
    // args[0] = template strings, args[1..n] = interpolated values in order:
    // userId, current_streak, longest_streak, freeze_count, days_since, freezes_used, last_processed_date
    capturedUpserts.push({
      userId: args[1],
      current_streak: args[2],
      longest_streak: args[3],
      freeze_count: args[4],
      days_since_last_freeze_earned: args[5],
      freezes_used: JSON.parse(args[6] || '[]'),
      last_processed_date: args[7] || null,
    });
    return Promise.resolve([]);
  }
  return Promise.resolve([]);
};

require.cache[require.resolve('./db')] = {
  id: require.resolve('./db'),
  filename: path.join(libDir, 'db.js'),
  loaded: true,
  exports: { sql: mockSql, initializeDatabase: () => Promise.resolve() },
};

require.cache[require.resolve('./garmin')] = {
  id: require.resolve('./garmin'),
  filename: path.join(libDir, 'garmin.js'),
  loaded: true,
  exports: {
    fetchDailySteps: (_tokens, _start, _end) =>
      Promise.resolve({ steps: mockGarminSteps, updatedTokens: mockGarminTokens }),
  },
};

require.cache[require.resolve('./logger')] = {
  id: require.resolve('./logger'),
  filename: path.join(libDir, 'logger.js'),
  loaded: true,
  exports: { info: () => {}, debug: () => {}, error: () => {}, warn: () => {} },
};

// Load the real steps and streak modules (not mocked) so we exercise the real
// upsertStreakResult and calculateStreak / applyIncrementalDays.
delete require.cache[require.resolve('./steps')];
delete require.cache[require.resolve('./streak')];

const { syncIfNeeded } = require('./sync');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STEP_GOAL = 10000;
const MET = STEP_GOAL;
const MISS = STEP_GOAL - 1;

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function makeRow(date, steps) {
  return { date, steps, goal_met: steps >= STEP_GOAL };
}

const DEFAULT_USER = {
  id: 'user-1',
  garmin_tokens: JSON.stringify({ access_token: 'tok' }),
  last_synced_at: null, // null → always needs sync
};

beforeEach(() => {
  capturedUpserts = [];
  mockDailyStepsRows = [];
  mockStreakRows = [];
  mockGarminSteps = [];
});

// ---------------------------------------------------------------------------
// Test 1: Full recalc on first sync (no persisted streak row)
// ---------------------------------------------------------------------------
test('syncIfNeeded: persists streak after first sync (full recalc, no prior row)', async () => {
  // Garmin returns 5 goal-met days.
  const dates = [daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1)];
  mockGarminSteps = dates.map((d) => ({ date: d, steps: MET }));

  // After upsertSteps, daily_steps contains the same records.
  mockDailyStepsRows = dates.map((d) => makeRow(d, MET));

  // No persisted streak row.
  mockStreakRows = [];

  await syncIfNeeded(DEFAULT_USER, { fatalOnMissingTokens: true, fatalOnSyncError: true });

  assert.equal(capturedUpserts.length, 1, 'exactly one upsert');
  const u = capturedUpserts[0];
  assert.equal(u.userId, 'user-1');
  assert.equal(u.current_streak, 5, 'current_streak should be 5');
  assert.equal(u.longest_streak, 5, 'longest_streak should be 5');
  assert.equal(u.freeze_count, 1, 'should have earned 1 freeze after 5 days');
  assert.equal(u.days_since_last_freeze_earned, 0);
  assert.equal(u.last_processed_date, daysAgo(1), 'last_processed_date = yesterday');
});

// ---------------------------------------------------------------------------
// Test 2: Incremental update when Garmin returns only forward data
// ---------------------------------------------------------------------------
test('syncIfNeeded: uses incremental update for forward-only Garmin data', async () => {
  // Existing persisted state: 5 met days (freeze earned), last_processed_date = 6 days ago.
  const oldDates = [daysAgo(6), daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2)];
  // The Neon/pg driver parses JSONB columns into JS objects, so freezes_used is
  // an array, not a JSON string.
  mockStreakRows = [{
    current_streak: 5,
    longest_streak: 5,
    freeze_count: 1,
    days_since_last_freeze_earned: 0,
    freezes_used: [],
    last_processed_date: daysAgo(2),
  }];

  // All daily_steps (old + new).
  mockDailyStepsRows = [
    ...oldDates.map((d) => makeRow(d, MET)),
    makeRow(daysAgo(1), MET), // 1 new forward day
  ];

  // Garmin returns only the new day.
  mockGarminSteps = [{ date: daysAgo(1), steps: MET }];

  await syncIfNeeded(DEFAULT_USER, { fatalOnMissingTokens: true, fatalOnSyncError: true });

  assert.equal(capturedUpserts.length, 1);
  const u = capturedUpserts[0];
  // Streak should now be 6, still 1 freeze, days_since = 1.
  assert.equal(u.current_streak, 6);
  assert.equal(u.freeze_count, 1);
  assert.equal(u.days_since_last_freeze_earned, 1);
  assert.equal(u.last_processed_date, daysAgo(1));
});

// ---------------------------------------------------------------------------
// Test 3: Full recalc on historical backfill
// ---------------------------------------------------------------------------
test('syncIfNeeded: falls back to full recalc when Garmin returns historical data', async () => {
  // Persisted state: 3 met days, last processed 3 days ago.
  mockStreakRows = [{
    current_streak: 3,
    longest_streak: 3,
    freeze_count: 0,
    days_since_last_freeze_earned: 3,
    freezes_used: [],
    last_processed_date: daysAgo(3),
  }];

  // DB contains all days including the historical update.
  const allDates = [daysAgo(5), daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1)];
  mockDailyStepsRows = allDates.map((d) => makeRow(d, MET));

  // Garmin returns a historical day (5 days ago) plus 2 new days — triggers backfill.
  mockGarminSteps = [
    { date: daysAgo(5), steps: MET }, // historical
    { date: daysAgo(2), steps: MET },
    { date: daysAgo(1), steps: MET },
  ];

  await syncIfNeeded(DEFAULT_USER, { fatalOnMissingTokens: true, fatalOnSyncError: true });

  assert.equal(capturedUpserts.length, 1);
  const u = capturedUpserts[0];
  // Full recalc: 5 met days → streak = 5, 1 freeze earned.
  assert.equal(u.current_streak, 5);
  assert.equal(u.freeze_count, 1);
  assert.equal(u.last_processed_date, daysAgo(1));
});

// ---------------------------------------------------------------------------
// Test 4: syncIfNeeded skips when cooldown has not elapsed
// ---------------------------------------------------------------------------
test('syncIfNeeded: skips sync and upsert when cooldown has not elapsed', async () => {
  const recentUser = { ...DEFAULT_USER, last_synced_at: new Date().toISOString() };
  const result = await syncIfNeeded(recentUser, { fatalOnMissingTokens: true, fatalOnSyncError: true });
  assert.equal(result, false);
  assert.equal(capturedUpserts.length, 0);
});
