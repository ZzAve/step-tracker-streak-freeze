### Requirement: Streak calculation
The system SHALL calculate the user's current streak as the number of consecutive days (including freeze days) where either the step goal was met or a freeze was applied. The default step goal is 10,000 steps.

#### Scenario: Consecutive days meeting goal
- **WHEN** user has met the 10,000 step goal for 7 consecutive days
- **THEN** current streak SHALL be 7

#### Scenario: Streak broken without freeze
- **WHEN** user misses the step goal and has 0 freezes available
- **THEN** current streak SHALL reset to 0

#### Scenario: Streak includes freeze days
- **WHEN** user has a 5-day streak, misses day 6 (freeze applied), then meets goal on day 7
- **THEN** current streak SHALL be 7

### Requirement: Earning streak freezes
The system SHALL award 1 streak freeze for every 5 days the user meets their step goal. The counter resets to 0 after earning a freeze and after a freeze is used.

#### Scenario: Earn freeze after 5 days
- **WHEN** user meets step goal for 5 consecutive counted days
- **THEN** user receives +1 freeze and the earn-counter resets to 0

#### Scenario: Counter resets after freeze used
- **WHEN** a freeze is applied on a missed day
- **THEN** the earn-counter resets to 0 and counting restarts from the next goal-met day

#### Scenario: Earning continues after reset
- **WHEN** user earns a freeze (counter resets to 0) and then meets the goal for 5 more days
- **THEN** user receives another +1 freeze

### Requirement: Maximum freeze cap
The system SHALL enforce a maximum of 2 streak freezes in the user's inventory at any time.

#### Scenario: At maximum freezes
- **WHEN** user has 2 freezes and would earn another (5 days met)
- **THEN** freeze count stays at 2 and the earn-counter resets to 0

### Requirement: Automatic freeze application
The system SHALL automatically apply a freeze when the user misses their step goal and has at least 1 freeze available.

#### Scenario: Auto-apply freeze on missed day
- **WHEN** user does not meet the 10,000 step goal and has ≥1 freeze
- **THEN** system applies 1 freeze, freeze count decreases by 1, streak continues, earn-counter resets to 0

#### Scenario: No freeze available on missed day
- **WHEN** user does not meet the 10,000 step goal and has 0 freezes
- **THEN** streak resets to 0, earn-counter resets to 0

### Requirement: Longest streak tracking
The system SHALL track the user's longest streak ever achieved.

#### Scenario: New longest streak
- **WHEN** current streak exceeds the stored longest streak
- **THEN** longest streak is updated to current streak value

#### Scenario: Streak breaks below record
- **WHEN** streak resets to 0
- **THEN** longest streak value SHALL remain unchanged

### Requirement: Streak state persistence
The system SHALL persist the computed streak state to the `streaks` table after each Garmin sync. The persisted row SHALL include `current_streak`, `longest_streak`, `freeze_count`, `days_since_last_freeze_earned`, `freezes_used` (JSONB array of `{date}` objects for days where a freeze was consumed), and `last_processed_date` (the latest `daily_steps` date included in the calculation, excluding today).

#### Scenario: Streak persisted after sync
- **WHEN** `syncIfNeeded` upserts new `daily_steps` records for a user
- **THEN** it SHALL compute the updated streak state and await an upsert to the `streaks` table

#### Scenario: Streak read from DB on API request
- **WHEN** `fetchStepsAndStreak(userId)` is called and a persisted `streaks` row exists with a current `last_processed_date`
- **THEN** the function SHALL return the persisted streak without calling `calculateStreak`, reconstructing `day_annotations` from `daily_steps + freezes_used`

#### Scenario: Fallback to full recalc when no persisted row
- **WHEN** `fetchStepsAndStreak(userId)` is called and no `streaks` row exists
- **THEN** the function SHALL fall back to `calculateStreak(allSteps, null)`

### Requirement: Day-rollover handling
When `daily_steps` records exist for dates after `last_processed_date` and before today (days that became "yesterday" since the last computation), the system SHALL update the streak before returning, using the incremental path when safe.

#### Scenario: Day-rollover detected on read
- **WHEN** `fetchStepsAndStreak(userId)` is called and `daily_steps` contains records with dates strictly between `last_processed_date` and today
- **THEN** the function SHALL apply an incremental update (or full recalc fallback), return the updated streak, and asynchronously persist the new state

### Requirement: Incremental streak update
When new step data arrives from Garmin and all upserted records have dates strictly after `last_processed_date`, the system SHALL advance the streak state incrementally rather than recomputing from scratch.

#### Scenario: Incremental update for forward-only data
- **WHEN** `syncIfNeeded` upserts `daily_steps` records whose dates are all strictly after `last_processed_date`
- **THEN** the system SHALL call `applyIncrementalDays()` and persist the result

#### Scenario: Full recalc on historical backfill
- **WHEN** `syncIfNeeded` upserts at least one `daily_steps` record with a date on or before `last_processed_date`
- **THEN** the system SHALL fall back to `calculateStreak()` and persist the full result

#### Scenario: Empty new days — unchanged state
- **WHEN** `applyIncrementalDays` is called with an empty `newDays` array
- **THEN** the function SHALL return `{ safe: true, result: <unchanged state> }`

#### Scenario: Backfill detected in incremental input
- **WHEN** `applyIncrementalDays` receives a `newDays` entry with `date <= persistedState.last_processed_date`
- **THEN** the function SHALL return `{ safe: false }`
