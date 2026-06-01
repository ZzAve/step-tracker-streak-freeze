## Phase 0 — Spec artifacts

- [x] 0.1 Create change proposal (`proposal.md`)
- [x] 0.2 Create design doc (`design.md`)
- [x] 0.3 Create tasks (`tasks.md`)
- [x] 0.4 Add MODIFIED spec for `streak-engine` in `specs/streak-engine/spec.md`

## Phase 1 — Read from DB, write on sync (full recalc)

- [x] 1.1 Write migration `011_add-streak-persistence.sql` adding `freezes_used JSONB` and `last_processed_date DATE` to `streaks`
- [x] 1.2 Export `DAYS_PER_FREEZE` and `MAX_FREEZES` from `lib/streak.js`
- [x] 1.3 Add `upsertStreakResult(userId, streakResult, lastProcessedDate)` to `lib/steps.js`
- [x] 1.4 Update `fetchStepsAndStreak` to read from `streaks`; reconstruct `day_annotations` from `allSteps + freezes_used`; fall back to `calculateStreak` when no row exists
- [x] 1.5 Replace fire-and-forget in `sync.js` with awaited `upsertStreakResult`; remove `fetchStepsAndStreak` import; query `daily_steps` directly for streak computation
- [x] 1.6 Test: `fetchStepsAndStreak` returns persisted streak from DB when row exists
- [x] 1.7 Test: `fetchStepsAndStreak` falls back to full recalc when no DB row
- [x] 1.8 Test: `syncIfNeeded` persists streak via `upsertStreakResult` after sync

## Phase 2 — Incremental (partial) updates

- [x] 2.1 Add `applyIncrementalDays(persistedState, newDays)` to `lib/streak.js`; returns `{ safe, result? }`
- [x] 2.2 Update `sync.js` to attempt incremental update; detect backfill via `stepRecords`; fall back to full recalc if needed
- [x] 2.3 Update `fetchStepsAndStreak` to detect day-rollover; apply incremental (or full recalc fallback) and persist async when unprocessed past days are found
- [x] 2.4 Test (`applyIncrementalDays`): clean run — incremental matches full recalc
- [x] 2.5 Test (`applyIncrementalDays`): missed-day with no freeze — streak resets
- [x] 2.6 Test (`applyIncrementalDays`): freeze earned — counter resets and freeze_count incremented
- [x] 2.7 Test (`applyIncrementalDays`): freeze used on missed day — streak continues, freeze_count decremented
- [x] 2.8 Test (`applyIncrementalDays`): backfill (day ≤ last_processed_date) — returns `{ safe: false }`
- [x] 2.9 Test (`applyIncrementalDays`): cap reached — freeze_count stays at MAX_FREEZES
- [x] 2.10 Test (`applyIncrementalDays`): empty new days — returns unchanged state
- [x] 2.11 Test (`fetchStepsAndStreak`): day-rollover triggers incremental update and persists async
- [x] 2.12 Test (`sync.js`): incremental used when Garmin returns only forward data
- [x] 2.13 Test (`sync.js`): full recalc used when Garmin returns historical data
