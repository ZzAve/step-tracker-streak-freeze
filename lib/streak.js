'use strict';

const STEP_GOAL = 10000;
const MAX_FREEZES = 2;
const DAYS_PER_FREEZE = 5;

/**
 * Calculate streak state from scratch given all daily step records.
 *
 * @param {Array<{date: string, steps: number, goal_met: boolean}>} dailySteps
 *   Sorted ascending by date.
 * @param {Object|null} _currentStreakData
 *   Ignored – kept for API compatibility. The function is fully idempotent and
 *   derives everything from dailySteps.
 * @returns {{
 *   current_streak: number,
 *   longest_streak: number,
 *   freeze_count: number,
 *   days_since_last_freeze_earned: number,
 *   freezes_used: Array<{date: string}>
 * }}
 */
function calculateStreak(dailySteps, _currentStreakData) {
  // Work on a stable copy sorted ascending.
  const days = [...dailySteps].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let freeze_count = 0;
  let days_since_last_freeze_earned = 0;
  let current_streak = 0;
  let longest_streak = 0;
  const freezes_used = [];

  // Determine today's date string (YYYY-MM-DD) for the "don't count today" rule.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // We process days in chronological order to correctly track freeze earning
  // and spending.  After the full pass we derive current_streak by walking
  // backwards from the most-recent day (excluding today).

  // --- Forward pass: simulate earning/spending freezes and tag each day ---
  // Each element will be annotated with { goalMet, freezeApplied, streakContinues }
  const annotated = days
    .filter((day) => day.date < todayStr)
    .map((day) => {
      const goalMet = day.steps >= STEP_GOAL || day.goal_met === true;
      return { date: day.date, steps: day.steps, goalMet, freezeApplied: false };
    });

  // We need to figure out the running streak length (for longest_streak) AND
  // the final state.  Do a single forward pass tracking running streak.

  let runningStreak = 0;

  for (let i = 0; i < annotated.length; i++) {
    const day = annotated[i];

    if (day.goalMet) {
      // Day succeeded.
      runningStreak += 1;
      days_since_last_freeze_earned += 1;

      // Check if we earn a freeze.
      if (days_since_last_freeze_earned >= DAYS_PER_FREEZE) {
        days_since_last_freeze_earned = 0;
        if (freeze_count < MAX_FREEZES) {
          freeze_count += 1;
        }
        // Counter resets even if already at max.
      }
    } else {
      // Missed day.
      if (freeze_count > 0) {
        // Apply freeze – streak continues.
        freeze_count -= 1;
        days_since_last_freeze_earned = 0;
        day.freezeApplied = true;
        runningStreak += 1;
        freezes_used.push({ date: day.date });
      } else {
        // Streak broken.
        runningStreak = 0;
        days_since_last_freeze_earned = 0;
      }
    }

    if (runningStreak > longest_streak) {
      longest_streak = runningStreak;
    }
  }

  // --- Determine current_streak ---
  // Walk annotated days backwards from the last day before today.
  // Find contiguous days where either goalMet or freezeApplied.
  // Today is excluded (we don't know yet if today's goal will be met).

  const pastDays = annotated.filter((d) => d.date < todayStr);

  // Re-derive current_streak from scratch using the annotated data.
  // We need to replay freeze logic again because the backwards walk needs the
  // same freeze decisions made in the forward pass (already stored in
  // day.freezeApplied).

  current_streak = 0;
  for (let i = pastDays.length - 1; i >= 0; i--) {
    const day = pastDays[i];
    if (day.goalMet || day.freezeApplied) {
      current_streak += 1;
    } else {
      break;
    }
  }

  // longest_streak was tracked during the forward pass; current_streak might
  // not be fully reflected if today is included in the forward pass but
  // excluded from current_streak.  Ensure longest_streak >= current_streak.
  if (current_streak > longest_streak) {
    longest_streak = current_streak;
  }

  // Build day_annotations: per-day status for all past days (chronological)
  const day_annotations = pastDays.map((day) => ({
    date: day.date,
    status: day.goalMet ? 'hit' : day.freezeApplied ? 'freeze' : 'not_met',
  }));

  return {
    current_streak,
    longest_streak,
    freeze_count,
    days_since_last_freeze_earned,
    freezes_used,
    day_annotations,
  };
}

module.exports = { calculateStreak, STEP_GOAL };
