'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateStreak, STEP_GOAL } = require('./streak.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a dailySteps array.
 * @param {Array<{date: string, steps: number}>} entries
 */
function makeDays(entries) {
  return entries.map(({ date, steps }) => ({
    date,
    steps,
    goal_met: steps >= STEP_GOAL,
  }));
}

/**
 * Generate date strings going backwards from a base date.
 * base is a YYYY-MM-DD string representing "yesterday" (most recent past day).
 * Returns [base - (n-1) days, …, base] (ascending).
 */
function pastDates(n, base) {
  const result = [];
  const baseMs = new Date(base + 'T12:00:00Z').getTime();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(baseMs - i * 86400000);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/** Yesterday's date string */
function yesterday() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** N days ago (1 = yesterday) */
function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const MET = STEP_GOAL;       // exactly meets goal
const MISS = STEP_GOAL - 1;  // misses goal

// ---------------------------------------------------------------------------
// Scenario 1: Consecutive days meeting goal → streak = 7
// ---------------------------------------------------------------------------
test('Scenario 1: 7 consecutive goal-met days → streak = 7', () => {
  const dates = pastDates(7, yesterday());
  const days = makeDays(dates.map((date) => ({ date, steps: MET })));
  const result = calculateStreak(days, null);
  assert.equal(result.current_streak, 7);
});

// ---------------------------------------------------------------------------
// Scenario 2: Streak broken without freeze → streak = 0
// ---------------------------------------------------------------------------
test('Scenario 2: missed day with 0 freezes → streak = 0', () => {
  // 3 met days, then 1 missed day most-recently
  const dates = pastDates(4, yesterday());
  const steps = [MET, MET, MET, MISS];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.current_streak, 0);
  assert.equal(result.freeze_count, 0);
});

// ---------------------------------------------------------------------------
// Scenario 3: Streak includes freeze days
// Pattern: 5 met, 1 miss (freeze), 1 met → streak = 7
// ---------------------------------------------------------------------------
test('Scenario 3: 5 met + 1 miss (freeze applied) + 1 met → streak = 7', () => {
  // Oldest first: [MET x5, MISS, MET]
  // The 5 met days earn 1 freeze; the miss uses it; the last day is met.
  const dates = pastDates(7, yesterday());
  const steps = [MET, MET, MET, MET, MET, MISS, MET];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.current_streak, 7);
  assert.equal(result.freezes_used.length, 1);
});

// ---------------------------------------------------------------------------
// Scenario 4: Earn freeze after 5 goal-met days → +1 freeze, counter = 0
// ---------------------------------------------------------------------------
test('Scenario 4: 5 goal-met days → freeze_count = 1, days_since_last_freeze_earned = 0', () => {
  const dates = pastDates(5, yesterday());
  const days = makeDays(dates.map((date) => ({ date, steps: MET })));
  const result = calculateStreak(days, null);
  assert.equal(result.freeze_count, 1);
  assert.equal(result.days_since_last_freeze_earned, 0);
});

// ---------------------------------------------------------------------------
// Scenario 5: Counter resets after freeze is used
// 5 met (earn freeze) + 1 miss (freeze used) → counter = 0
// ---------------------------------------------------------------------------
test('Scenario 5: freeze used → days_since_last_freeze_earned = 0', () => {
  const dates = pastDates(6, yesterday());
  const steps = [MET, MET, MET, MET, MET, MISS];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.days_since_last_freeze_earned, 0);
  assert.equal(result.freeze_count, 0);
  assert.equal(result.freezes_used.length, 1);
});

// ---------------------------------------------------------------------------
// Scenario 6: Earning continues after reset – 5 met, miss (earn+use), 5 more met
// → second freeze earned, counter = 0
// ---------------------------------------------------------------------------
test('Scenario 6: earn freeze, use it, earn again after 5 more days', () => {
  // [MET x5, MISS, MET x5]  – 11 past days
  const dates = pastDates(11, yesterday());
  const steps = [MET, MET, MET, MET, MET, MISS, MET, MET, MET, MET, MET];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  // After freeze used on day 6 counter resets; 5 more met days earn another freeze.
  assert.equal(result.freeze_count, 1);
  assert.equal(result.days_since_last_freeze_earned, 0);
  assert.equal(result.freezes_used.length, 1);
});

// ---------------------------------------------------------------------------
// Scenario 7: Already at maximum freezes (2) – earning another → stays at 2,
// counter resets
// ---------------------------------------------------------------------------
test('Scenario 7: at max freezes (2), earning another → freeze_count stays 2, counter resets', () => {
  // Need to accumulate 2 freezes then earn a third.
  // 5 met (earn 1) + 5 met (earn 2) + 5 met (would earn 3) = 15 met days
  const dates = pastDates(15, yesterday());
  const days = makeDays(dates.map((date) => ({ date, steps: MET })));
  const result = calculateStreak(days, null);
  assert.equal(result.freeze_count, 2);
  assert.equal(result.days_since_last_freeze_earned, 0);
});

// ---------------------------------------------------------------------------
// Scenario 8: Auto-apply freeze on missed day
// miss + ≥1 freeze → freeze applied, streak continues, counter = 0
// ---------------------------------------------------------------------------
test('Scenario 8: auto-apply freeze on missed day → streak continues', () => {
  // 5 met (earn freeze) then 1 miss → freeze applied, streak = 6
  const dates = pastDates(6, yesterday());
  const steps = [MET, MET, MET, MET, MET, MISS];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.current_streak, 6);
  assert.equal(result.freeze_count, 0);
  assert.equal(result.days_since_last_freeze_earned, 0);
  assert.equal(result.freezes_used.length, 1);
});

// ---------------------------------------------------------------------------
// Scenario 9: No freeze on missed day → streak = 0, counter = 0
// ---------------------------------------------------------------------------
test('Scenario 9: missed day with no freeze → streak = 0, counter = 0', () => {
  const dates = pastDates(3, yesterday());
  const steps = [MET, MET, MISS];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.current_streak, 0);
  assert.equal(result.days_since_last_freeze_earned, 0);
});

// ---------------------------------------------------------------------------
// Scenario 10: Longest streak updated when current > longest
// ---------------------------------------------------------------------------
test('Scenario 10: current_streak > previous longest → longest updated', () => {
  // All 7 days met → longest = 7, current = 7
  const dates = pastDates(7, yesterday());
  const days = makeDays(dates.map((date) => ({ date, steps: MET })));
  const result = calculateStreak(days, null);
  assert.equal(result.longest_streak, 7);
  assert.equal(result.current_streak, 7);
});

// ---------------------------------------------------------------------------
// Scenario 11: Longest streak preserved when streak resets
// ---------------------------------------------------------------------------
test('Scenario 11: streak resets → longest_streak preserved', () => {
  // 4 met (no freeze earned), then miss (no freeze), then 2 met
  // longest should be 4, current should be 2
  const dates = pastDates(7, yesterday());
  const steps = [MET, MET, MET, MET, MISS, MET, MET];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);
  assert.equal(result.longest_streak, 4);
  assert.equal(result.current_streak, 2);
});

// ---------------------------------------------------------------------------
// STEP_GOAL constant
// ---------------------------------------------------------------------------
test('STEP_GOAL is exported and equals 10000', () => {
  assert.equal(STEP_GOAL, 10000);
});
