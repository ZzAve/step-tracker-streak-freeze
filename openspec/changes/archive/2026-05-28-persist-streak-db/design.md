## Context

Every call to `fetchStepsAndStreak(userId)` (`lib/steps.js`) fetches all `daily_steps` rows for the user and runs `calculateStreak()` — an O(n) pass over the full history. The `streaks` table exists and `syncIfNeeded` writes to it fire-and-forget, but no read path uses it. The result is redundant computation on every dashboard refresh and widget poll.

The core insight: the streak calculation is deterministic and monotonically advancing. Given a persisted state `S` as of date `D`, processing only the days after `D` is sufficient to produce the new state — as long as no historical data changed.

## Goals / Non-Goals

**Goals:**
- `streaks` row is the source of truth for API responses
- Streak is persisted atomically (awaited) after each Garmin sync
- Incremental update replaces full recalc for forward-only step data
- Day-rollover: past days excluded from a prior calculation are picked up on next read
- Full recalc fallback when incremental cannot be safely applied (historical backfill)
- `freezes_used` persisted so `day_annotations` can be reconstructed at read time without re-running the algorithm
- Zero changes to `/api/steps` or `/api/widget` response shapes

**Non-Goals:**
- Changing streak rules (goal threshold, freeze earn cadence, cap, coverage)
- Streaming or real-time updates
- Optimising the `day_annotations` array size (full history is stored in-memory; DB stores `freezes_used` only)

## Decisions

### 1. Schema: add `freezes_used JSONB` and `last_processed_date DATE` to `streaks`

The `freezes_used` column stores the list of `{date}` objects marking days where a freeze was consumed. This lets `fetchStepsAndStreak` reconstruct `day_annotations` without replaying the full algorithm:

```sql
status = goal_met ? 'hit' : (date IN freezes_used) ? 'freeze' : 'not_met'
```

`last_processed_date` is the date of the latest `daily_steps` row included in the persisted state. It enables:
- Day-rollover detection: are there `daily_steps` rows between `last_processed_date` and yesterday?
- Incremental update: which `daily_steps` rows are new?
- Backfill detection: did the sync upsert any rows ≤ `last_processed_date`?

**Why not store `day_annotations` directly?** It grows unboundedly with time. `freezes_used` is small (typically ≤ tens of entries) and is sufficient to reconstruct annotations at O(n) read time.

### 2. `applyIncrementalDays(persistedState, newDays)` in `lib/streak.js`

A pure function that advances a persisted streak state forward:

```
input:  persistedState = { current_streak, longest_streak, freeze_count,
                           days_since_last_freeze_earned, freezes_used,
                           last_processed_date }
        newDays = daily_steps rows to process (all assumed to be after last_processed_date and before today)

output: { safe: true, result: { ...updatedFields, last_processed_date } }
     OR { safe: false }  — caller must fall back to full recalc
```

The function returns `{ safe: false }` if any `newDays` entry has `date <= last_processed_date` (backfill). Otherwise it applies the same per-day logic as `calculateStreak`'s forward pass and returns the updated state.

The `current_streak` in `persistedState` is the running consecutive count ending at `last_processed_date`. Extending it forward is a simple O(k) loop over k new days.

**Why keep it in `streak.js`?** It shares the same constants (`STEP_GOAL`, `DAYS_PER_FREEZE`, `MAX_FREEZES`) and the same per-day logic. Co-location avoids duplication and makes it easy to keep both in sync.

### 3. `upsertStreakResult(userId, streakResult, lastProcessedDate)` in `lib/steps.js`

Centralises the streak write. Called by:
- `sync.js` after each sync (Phase 1: full recalc; Phase 2: incremental or full recalc)
- `fetchStepsAndStreak` after a day-rollover update (fire-and-forget, async background)

Stores `current_streak`, `longest_streak`, `freeze_count`, `days_since_last_freeze_earned`, `freezes_used` (JSONB), `last_processed_date`, and `updated_at`.

### 4. `fetchStepsAndStreak` reads from DB; applies incremental on day-rollover

Read path after changes:
1. Fetch `daily_steps` (always needed for `allSteps` in the API response)
2. Fetch `streaks` row
3. If row exists and `last_processed_date` is current (no unprocessed past days): reconstruct `day_annotations` from `allSteps + freezes_used` and return
4. If row exists but unprocessed past days exist (day-rollover): try incremental → fall back to full recalc → persist async → return
5. If no row: full recalc (no persist — sync will do it on next trigger)

**Why derive `day_annotations` at read time?** It keeps `upsertStreakResult` simple (no unbounded array write) and is O(n) with a Set lookup — negligible cost for the read path.

### 5. `sync.js` incremental update path

After `upsertSteps()`:
1. Fetch all `daily_steps` from DB (needed for full recalc fallback)
2. Fetch current `streaks` row
3. If persisted state exists AND no upserted record has `date <= last_processed_date`: call `applyIncrementalDays` with the new past days
4. If `applyIncrementalDays` returns `{ safe: true }`: use incremental result
5. Otherwise: full recalc via `calculateStreak`
6. Await `upsertStreakResult` (no more fire-and-forget)

**Why check the upserted `stepRecords` for backfill rather than querying DB?** The sync function already has the upserted records in memory. Checking them for historical dates is O(k) and avoids an extra DB round-trip.

## Risks / Trade-offs

- **[Stale streak on crash between sync and upsert]** If the process crashes after `upsertSteps` but before `upsertStreakResult`, the `streaks` row will be stale. The next sync or day-rollover will correct it. Acceptable for this use case.
- **[Day-rollover async persist]** The background persist in `fetchStepsAndStreak` means two near-simultaneous requests could both trigger a rollover update. The upsert is idempotent (`ON CONFLICT DO UPDATE`) so both will write the same result — no corruption.
- **[Incremental state divergence]** If a bug in `applyIncrementalDays` produces a wrong result, it will persist and compound over time. Mitigation: comprehensive tests comparing incremental vs full-recalc across all scenario types; full recalc fallback on any detected anomaly.
