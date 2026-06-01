'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateStreak, applyIncrementalDays, extendStreakWithToday, todayStr, STEP_GOAL, DAYS_PER_FREEZE, MAX_FREEZES } = require('./streak.js');

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
// ---------------------------------------------------------------------------
// Scenario 12: day_annotations returns per-day status
// ---------------------------------------------------------------------------
test('Scenario 12: day_annotations includes hit, freeze, and not_met statuses', () => {
  // 5 met (earn freeze) + 1 miss (freeze applied) + 1 miss (no freeze) + 2 met
  const dates = pastDates(9, yesterday());
  const steps = [MET, MET, MET, MET, MET, MISS, MISS, MET, MET];
  const days = makeDays(dates.map((date, i) => ({ date, steps: steps[i] })));
  const result = calculateStreak(days, null);

  assert.ok(Array.isArray(result.day_annotations));
  assert.equal(result.day_annotations.length, 9);

  // First 5 days: hit
  for (let i = 0; i < 5; i++) {
    assert.equal(result.day_annotations[i].status, 'hit', `day ${i} should be hit`);
  }
  // Day 6: freeze applied
  assert.equal(result.day_annotations[5].status, 'freeze');
  // Day 7: not met (no freeze left)
  assert.equal(result.day_annotations[6].status, 'not_met');
  // Days 8-9: hit
  assert.equal(result.day_annotations[7].status, 'hit');
  assert.equal(result.day_annotations[8].status, 'hit');
});

// ---------------------------------------------------------------------------
// STEP_GOAL constant
// ---------------------------------------------------------------------------
test('STEP_GOAL is exported and equals 10000', () => {
  assert.equal(STEP_GOAL, 10000);
});

// ---------------------------------------------------------------------------
// applyIncrementalDays — Phase 2 incremental update tests
// ---------------------------------------------------------------------------

// Helper: build a base persisted state as of `baseDate` from a full recalc.
function buildPersistedState(steps, baseDate) {
  const past = steps.filter((s) => s.date <= baseDate);
  // Temporarily override "today" by filtering through calculateStreak which
  // uses actual Date.now(). Since baseDate is in the past relative to the
  // test run date, all `past` records will be treated as past days.
  const result = calculateStreak(past, null);
  return {
    current_streak: result.current_streak,
    longest_streak: result.longest_streak,
    freeze_count: result.freeze_count,
    days_since_last_freeze_earned: result.days_since_last_freeze_earned,
    freezes_used: result.freezes_used,
    last_processed_date: baseDate,
  };
}

// Returns a date string N days before `base` (base is a YYYY-MM-DD string).
function dateMinus(base, n) {
  const ms = new Date(base + 'T12:00:00Z').getTime();
  return new Date(ms - n * 86400000).toISOString().slice(0, 10);
}

test('applyIncrementalDays: returns { safe: false } when persistedState is null', () => {
  const { safe } = applyIncrementalDays(null, []);
  assert.equal(safe, false);
});

test('applyIncrementalDays: returns { safe: false } when last_processed_date is missing', () => {
  const { safe } = applyIncrementalDays({ current_streak: 3, longest_streak: 3, freeze_count: 0, days_since_last_freeze_earned: 3, freezes_used: [] }, []);
  assert.equal(safe, false);
});

test('applyIncrementalDays: empty newDays returns unchanged state', () => {
  const base = daysAgo(10);
  const state = {
    current_streak: 5,
    longest_streak: 7,
    freeze_count: 1,
    days_since_last_freeze_earned: 2,
    freezes_used: [{ date: daysAgo(12) }],
    last_processed_date: base,
  };
  const { safe, result } = applyIncrementalDays(state, []);
  assert.equal(safe, true);
  assert.equal(result.current_streak, 5);
  assert.equal(result.longest_streak, 7);
  assert.equal(result.freeze_count, 1);
  assert.equal(result.days_since_last_freeze_earned, 2);
  assert.equal(result.last_processed_date, base);
});

test('applyIncrementalDays: backfill (date <= last_processed_date) returns { safe: false }', () => {
  const base = daysAgo(5);
  const state = {
    current_streak: 5, longest_streak: 5, freeze_count: 0,
    days_since_last_freeze_earned: 5, freezes_used: [],
    last_processed_date: base,
  };
  // A day equal to last_processed_date is a backfill.
  const { safe } = applyIncrementalDays(state, [{ date: base, steps: MET, goal_met: true }]);
  assert.equal(safe, false);
});

test('applyIncrementalDays: backfill (date before last_processed_date) returns { safe: false }', () => {
  const base = daysAgo(5);
  const state = {
    current_streak: 5, longest_streak: 5, freeze_count: 0,
    days_since_last_freeze_earned: 5, freezes_used: [],
    last_processed_date: base,
  };
  const olderDay = dateMinus(base, 2);
  const { safe } = applyIncrementalDays(state, [{ date: olderDay, steps: MET, goal_met: true }]);
  assert.equal(safe, false);
});

test('applyIncrementalDays: today/future row returns { safe: false }', () => {
  const state = {
    current_streak: 3, longest_streak: 3, freeze_count: 0,
    days_since_last_freeze_earned: 3, freezes_used: [],
    last_processed_date: daysAgo(2),
  };
  // Today is incomplete and must not advance the persisted state.
  const { safe } = applyIncrementalDays(state, [{ date: todayStr(), steps: MET, goal_met: true }]);
  assert.equal(safe, false);
});

test('applyIncrementalDays: clean run — incremental matches full recalc', () => {
  // 7 past goal-met days, then 3 more new goal-met days.
  const allDates = pastDates(10, daysAgo(1)); // 10 past days ending yesterday
  const allSteps = makeDays(allDates.map((d) => ({ date: d, steps: MET })));

  // State as of the first 7 days.
  const splitDate = allDates[6]; // 7th date (index 6)
  const persistedState = buildPersistedState(allSteps, splitDate);

  // New days: the remaining 3.
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  // Full recalc for comparison.
  const full = calculateStreak(allSteps, null);

  assert.equal(result.current_streak, full.current_streak, 'current_streak');
  assert.equal(result.longest_streak, full.longest_streak, 'longest_streak');
  assert.equal(result.freeze_count, full.freeze_count, 'freeze_count');
  assert.equal(result.days_since_last_freeze_earned, full.days_since_last_freeze_earned, 'days_since');
  assert.equal(result.freezes_used.length, full.freezes_used.length, 'freezes_used.length');
});

test('applyIncrementalDays: missed-day with no freeze — streak resets', () => {
  // 4 past goal-met days (no freeze earned yet), then 1 missed day.
  const pastDays4 = pastDates(4, daysAgo(2)); // 4 days ending 2 days ago
  const missDay = daysAgo(1);
  const allSteps = [
    ...makeDays(pastDays4.map((d) => ({ date: d, steps: MET }))),
    { date: missDay, steps: MISS, goal_met: false },
  ];

  const splitDate = pastDays4[3]; // after the 4 met days
  const persistedState = buildPersistedState(allSteps, splitDate);
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  const full = calculateStreak(allSteps, null);

  assert.equal(result.current_streak, full.current_streak);
  assert.equal(result.freeze_count, full.freeze_count);
  assert.equal(result.days_since_last_freeze_earned, full.days_since_last_freeze_earned);
});

test('applyIncrementalDays: freeze earned — counter resets, freeze_count incremented', () => {
  // 5 past goal-met days → should earn 1 freeze.
  const dates5 = pastDates(5, daysAgo(1));
  const allSteps = makeDays(dates5.map((d) => ({ date: d, steps: MET })));

  const splitDate = dates5[2]; // after 3 met days
  const persistedState = buildPersistedState(allSteps, splitDate);
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  const full = calculateStreak(allSteps, null);

  assert.equal(result.freeze_count, full.freeze_count, 'freeze_count after earning');
  assert.equal(result.days_since_last_freeze_earned, full.days_since_last_freeze_earned, 'counter after earning');
});

test('applyIncrementalDays: freeze used on missed day — streak continues', () => {
  // 5 met (earn freeze) + 1 missed (freeze applied).
  const dates6 = pastDates(6, daysAgo(1));
  const steps6 = [MET, MET, MET, MET, MET, MISS];
  const allSteps = makeDays(dates6.map((date, i) => ({ date, steps: steps6[i] })));

  const splitDate = dates6[4]; // after 5 met days
  const persistedState = buildPersistedState(allSteps, splitDate);
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  const full = calculateStreak(allSteps, null);

  assert.equal(result.current_streak, full.current_streak, 'current_streak after freeze');
  assert.equal(result.freeze_count, full.freeze_count, 'freeze_count after freeze used');
  assert.equal(result.freezes_used.length, full.freezes_used.length, 'freezes_used count');
});

test('applyIncrementalDays: cap reached — freeze_count stays at MAX_FREEZES', () => {
  // 15 met days → would earn 3 freezes but capped at 2.
  const dates15 = pastDates(15, daysAgo(1));
  const allSteps = makeDays(dates15.map((d) => ({ date: d, steps: MET })));

  const splitDate = dates15[9]; // after 10 met days (2 freezes already earned)
  const persistedState = buildPersistedState(allSteps, splitDate);
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  const full = calculateStreak(allSteps, null);

  assert.equal(result.freeze_count, MAX_FREEZES, 'capped at MAX_FREEZES');
  assert.equal(result.freeze_count, full.freeze_count, 'matches full recalc');
  assert.equal(result.days_since_last_freeze_earned, full.days_since_last_freeze_earned, 'counter matches');
});

test('applyIncrementalDays: streak-break then recovery — current_streak matches full recalc', () => {
  // 4 met, 1 miss (no freeze), 3 met.
  const dates8 = pastDates(8, daysAgo(1));
  const steps8 = [MET, MET, MET, MET, MISS, MET, MET, MET];
  const allSteps = makeDays(dates8.map((date, i) => ({ date, steps: steps8[i] })));

  const splitDate = dates8[4]; // after the miss day
  const persistedState = buildPersistedState(allSteps, splitDate);
  const newDays = allSteps.filter((s) => s.date > splitDate);

  const { safe, result } = applyIncrementalDays(persistedState, newDays);
  assert.equal(safe, true);

  const full = calculateStreak(allSteps, null);

  assert.equal(result.current_streak, full.current_streak, 'current_streak after recovery');
  assert.equal(result.longest_streak, full.longest_streak, 'longest_streak');
});

test('exported constants: DAYS_PER_FREEZE and MAX_FREEZES', () => {
  assert.equal(typeof DAYS_PER_FREEZE, 'number');
  assert.equal(typeof MAX_FREEZES, 'number');
  assert.ok(DAYS_PER_FREEZE > 0);
  assert.ok(MAX_FREEZES > 0);
});

// ---------------------------------------------------------------------------
// extendStreakWithToday
// ---------------------------------------------------------------------------

function baseStreak(overrides = {}) {
  return {
    current_streak: 3,
    longest_streak: 5,
    freeze_count: 0,
    days_since_last_freeze_earned: 3,
    freezes_used: [],
    day_annotations: [],
    ...overrides,
  };
}

test('extendStreakWithToday: today goal met → current_streak +1, today added to day_annotations', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MET, goal_met: true }];
  const result = extendStreakWithToday(baseStreak(), allSteps, today);
  assert.equal(result.current_streak, 4);
  assert.equal(result.longest_streak, 5); // unchanged (4 < 5)
  assert.equal(result.day_annotations.length, 1);
  assert.equal(result.day_annotations[0].date, today);
  assert.equal(result.day_annotations[0].status, 'hit');
});

test('extendStreakWithToday: today goal met → longest_streak updated when current exceeds it', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MET, goal_met: true }];
  const result = extendStreakWithToday(baseStreak({ current_streak: 5, longest_streak: 5 }), allSteps, today);
  assert.equal(result.current_streak, 6);
  assert.equal(result.longest_streak, 6);
});

test('extendStreakWithToday: current_streak=0 and today goal met → streak becomes 1', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MET, goal_met: true }];
  const result = extendStreakWithToday(baseStreak({ current_streak: 0, longest_streak: 4 }), allSteps, today);
  assert.equal(result.current_streak, 1);
  assert.equal(result.longest_streak, 4); // unchanged
});

test('extendStreakWithToday: today goal NOT met → streak unchanged', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MISS, goal_met: false }];
  const original = baseStreak();
  const result = extendStreakWithToday(original, allSteps, today);
  assert.equal(result, original); // same reference — no copy made
});

test('extendStreakWithToday: no today record in allSteps → streak unchanged', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: '2026-01-09', steps: MET, goal_met: true }];
  const original = baseStreak();
  const result = extendStreakWithToday(original, allSteps, today);
  assert.equal(result, original);
});

test('extendStreakWithToday: today goal met via steps only (goal_met=false) → streak extends', () => {
  const today = '2026-01-10';
  // steps >= STEP_GOAL but goal_met flag is false (e.g. sync set it before goal was reached)
  const allSteps = [{ date: today, steps: MET, goal_met: false }];
  const result = extendStreakWithToday(baseStreak(), allSteps, today);
  assert.equal(result.current_streak, 4);
});

test('extendStreakWithToday: today goal met at freeze threshold → freeze earned', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MET, goal_met: true }];
  // One day before earning a freeze.
  const streak = baseStreak({ days_since_last_freeze_earned: DAYS_PER_FREEZE - 1, freeze_count: 0 });
  const result = extendStreakWithToday(streak, allSteps, today);
  assert.equal(result.days_since_last_freeze_earned, 0);
  assert.equal(result.freeze_count, 1);
});

test('extendStreakWithToday: freeze cap respected — freeze_count stays at MAX_FREEZES', () => {
  const today = '2026-01-10';
  const allSteps = [{ date: today, steps: MET, goal_met: true }];
  const streak = baseStreak({ days_since_last_freeze_earned: DAYS_PER_FREEZE - 1, freeze_count: MAX_FREEZES });
  const result = extendStreakWithToday(streak, allSteps, today);
  assert.equal(result.freeze_count, MAX_FREEZES); // still capped
  assert.equal(result.days_since_last_freeze_earned, 0); // counter resets
});
