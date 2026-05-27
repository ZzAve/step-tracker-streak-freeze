## Why

`fetchStepsAndStreak` (`lib/steps.js`) recomputes the entire streak from `daily_steps` on every dashboard load and every widget poll. This is wasted work: the streak rules are deterministic and the underlying step data rarely changes between requests.

The `streaks` table already exists (`migrations/003_create-streaks.sql`) and `lib/sync.js` writes a snapshot to it after each sync — but in a fire-and-forget manner and no code path reads from it. The streak is effectively stateless.

## What Changes

- Make the persisted `streaks` row the authoritative source for API responses
- Persist streak state (including `freezes_used` dates) atomically after each sync
- Update streak incrementally when new step data arrives rather than recomputing from scratch
- Fall back to full recalculation when an incremental update cannot safely be applied (e.g., historical backfill that crosses a streak boundary)
- Handle day-rollover: when the clock advances past midnight and previously-excluded "today" data becomes "yesterday", the streak is updated without requiring a new sync

## Capabilities

### New Capabilities
- `streak-persistence`: `applyIncrementalDays()` in `lib/streak.js` — advances a persisted streak state forward given a set of new daily_steps rows; returns `{ safe: boolean, result? }` so the caller can fall back to full recalc
- `streak-persistence`: `upsertStreakResult()` in `lib/steps.js` — persists computed streak state (including `freezes_used` and `last_processed_date`) to the `streaks` table
- `streak-persistence`: Day-rollover handling in `fetchStepsAndStreak` — detects unprocessed past days and applies incremental update before returning

### Modified Capabilities
- `streak-engine`: streak state is now persisted in DB and read on each API request; `freezes_used` is stored so per-date annotations can be reconstructed without re-running the full algorithm
- `shared-step-pipeline`: `fetchStepsAndStreak` reads from `streaks` rather than calling `calculateStreak` on every request; falls back to recalc only when no persisted row exists or unprocessed days are detected
- `data-sync`: the fire-and-forget streak write in `syncIfNeeded` is replaced with an awaited, guaranteed write; incremental update replaces full recalc when possible

## Impact

- **Schema**: `migrations/008_add-streak-persistence.sql` adds `freezes_used JSONB` and `last_processed_date DATE` to the `streaks` table
- **Code**: `lib/streak.js` (new `applyIncrementalDays`), `lib/steps.js` (new `upsertStreakResult`, updated `fetchStepsAndStreak`), `lib/sync.js` (awaited write, incremental logic)
- **APIs**: No changes to `/api/steps` or `/api/widget` response shapes
- **Tests**: New tests for `applyIncrementalDays` (pure function, all scenarios); new `lib/sync.test.js` for sync-persistence behaviour
