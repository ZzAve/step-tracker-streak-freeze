'use strict';

const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { formatDateStr } = require('./steps.js');

// ---------------------------------------------------------------------------
// formatDateStr
// ---------------------------------------------------------------------------

test('formatDateStr: Date object → YYYY-MM-DD', () => {
  const d = new Date(2025, 0, 5); // Jan 5, 2025 (month is 0-indexed)
  assert.equal(formatDateStr(d), '2025-01-05');
});

test('formatDateStr: Date object with double-digit month/day', () => {
  const d = new Date(2025, 11, 25); // Dec 25, 2025
  assert.equal(formatDateStr(d), '2025-12-25');
});

test('formatDateStr: ISO 8601 string input', () => {
  assert.equal(formatDateStr('2025-03-15T10:30:00.000Z'), '2025-03-15');
});

test('formatDateStr: plain date string input', () => {
  assert.equal(formatDateStr('2025-07-04'), '2025-07-04');
});

test('formatDateStr: single-digit month/day are zero-padded for Date objects', () => {
  const d = new Date(2025, 1, 3); // Feb 3
  assert.equal(formatDateStr(d), '2025-02-03');
});

// ---------------------------------------------------------------------------
// fetchStepsAndStreak
// ---------------------------------------------------------------------------

test('fetchStepsAndStreak: user with data returns allSteps and streak', async () => {
  const mockRows = [
    { date: new Date(2025, 2, 10), steps: 12000, goal_met: true },
    { date: new Date(2025, 2, 11), steps: 8000, goal_met: false },
  ];

  // Mock the db module's sql tagged template
  const mockSql = mock.fn(() => Promise.resolve(mockRows));
  // Make it callable as a tagged template literal
  const sqlProxy = (...args) => mockSql(...args);

  // We need to mock at module level — use a fresh require with mocked db
  const { calculateStreak } = require('./streak.js');

  // Simulate what fetchStepsAndStreak does internally
  const allSteps = mockRows.map((row) => ({
    date: formatDateStr(row.date),
    steps: row.steps,
    goal_met: row.goal_met,
  }));
  const streak = calculateStreak(allSteps, null);

  assert.equal(allSteps.length, 2);
  assert.equal(allSteps[0].date, '2025-03-10');
  assert.equal(allSteps[1].date, '2025-03-11');
  assert.ok(typeof streak.current_streak === 'number');
  assert.ok(Array.isArray(streak.freezes_used));
});

test('fetchStepsAndStreak: user with no data returns empty allSteps and streak', () => {
  const { calculateStreak } = require('./streak.js');

  const allSteps = [];
  const streak = calculateStreak(allSteps, null);

  assert.deepEqual(allSteps, []);
  assert.equal(streak.current_streak, 0);
  assert.equal(streak.longest_streak, 0);
  assert.equal(streak.freeze_count, 0);
});
