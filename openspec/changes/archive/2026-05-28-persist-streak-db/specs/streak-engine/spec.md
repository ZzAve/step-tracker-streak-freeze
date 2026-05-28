## MODIFIED Requirements

### Requirement: Streak state persistence
The system SHALL persist the computed streak state to the `streaks` table after each Garmin sync, replacing the existing fire-and-forget write with a guaranteed, awaited upsert. The persisted row SHALL include `current_streak`, `longest_streak`, `freeze_count`, `days_since_last_freeze_earned`, `freezes_used` (JSONB array of `{date}` objects for days where a freeze was consumed), and `last_processed_date` (the latest `daily_steps` date included in the calculation, excluding today).

#### Scenario: Streak persisted after sync
- **WHEN** `syncIfNeeded` upserts new `daily_steps` records for a user
- **THEN** it SHALL compute the updated streak state and await an upsert of all streak fields to the `streaks` table before returning

#### Scenario: Streak read from DB on API request
- **WHEN** `fetchStepsAndStreak(userId)` is called and a `streaks` row exists with a current `last_processed_date`
- **THEN** the function SHALL return the persisted streak state without calling `calculateStreak`, reconstructing `day_annotations` from `daily_steps` + `freezes_used`

#### Scenario: Fallback to full recalc when no persisted row
- **WHEN** `fetchStepsAndStreak(userId)` is called and no `streaks` row exists
- **THEN** the function SHALL fall back to `calculateStreak(allSteps, null)` and return the computed result without persisting

### Requirement: Day-rollover handling
The system SHALL detect when `daily_steps` records exist after `last_processed_date` and before today (i.e., days that were excluded from the prior calculation because they were "today" at the time). When such unprocessed days are found, the system SHALL update the streak before returning, using the incremental update path when safe, and persist the result asynchronously.

#### Scenario: Day-rollover detected on read
- **WHEN** `fetchStepsAndStreak(userId)` is called and `daily_steps` contains records with dates between `last_processed_date` (exclusive) and today (exclusive)
- **THEN** the function SHALL apply an incremental update (or full recalc on fallback), return the updated streak, and asynchronously persist the new state

### Requirement: Incremental streak update
The system SHALL maintain a `last_processed_date` in the persisted streak row marking the latest date included in the calculation. When new step data arrives and all upserted records have dates strictly after `last_processed_date`, the system SHALL apply an incremental update via `applyIncrementalDays()` rather than a full recalculation.

#### Scenario: Incremental update for forward-only data
- **WHEN** `syncIfNeeded` upserts `daily_steps` records whose dates are all strictly after `last_processed_date`
- **THEN** the system SHALL extend the streak state using only the new records, without re-processing historical data

#### Scenario: Full recalc on historical backfill
- **WHEN** `syncIfNeeded` upserts at least one `daily_steps` record with a date on or before `last_processed_date`
- **THEN** the system SHALL fall back to a full recalculation from all `daily_steps` records

#### Scenario: Empty new days
- **WHEN** `applyIncrementalDays` is called with an empty `newDays` array
- **THEN** the function SHALL return `{ safe: true, result: <unchanged state> }`

#### Scenario: Backfill detected in incremental input
- **WHEN** `applyIncrementalDays` receives a `newDays` entry with `date <= persistedState.last_processed_date`
- **THEN** the function SHALL return `{ safe: false }` so the caller falls back to full recalc
