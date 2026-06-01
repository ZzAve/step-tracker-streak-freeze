## Context

The Garmin widget calls `GET /api/widget?key={apiKey}` and is the one consumer that CI cannot build or test (no Connect IQ SDK in CI). Phase 3 puts a contract test in front of that endpoint so backend changes can't silently break the widget.

`api/widget.js` authenticates by sha256-hashing the query `key`, joining `api_keys` → `users`, and rejecting missing (`Missing API key`), unknown (`Invalid API key`), and past-`expires_at` (`API key expired`) keys with 401. On success it syncs-if-needed (a no-op for token-less users), computes the streak from `daily_steps`, and returns:

```
{ streak, longest, freezes, next_milestone, days_to_milestone,
  today_steps, step_goal, week: [{day, status} × 7], lastUpdatedAt, refreshAfter }
```

`MILESTONES = [5, 10, 25, 50, 100]`; `step_goal === STEP_GOAL (10000)`. The `week` array is built server-side from `new Date()` and the streak's `day_annotations`; the final entry (today) is `goal_met` only when today's steps ≥ goal, else `pending`.

## Decisions

- **Hybrid key acquisition.** Exactly one test mints a key via the real `POST /api/apikey` (Playwright's `request` fixture carries the registration `session` cookie forward) and proves it works against `/api/widget`. Every other test seeds the key hash directly via `seedApiKey`, avoiding the per-test login+mint round-trip while still covering the real path once. This is the split the user requested.
- **`seedApiKey(email, plaintextKey, { daysToExpiry = 365 })`** lives in `e2e/seed.js` beside `seedDailySteps`, reusing the same `pg.Client`/`DATABASE_URL` wiring. It mirrors `api/apikey.js`: `sha256(plaintext)` → `key_hash`, `plaintext.slice(0,8)` → `prefix`, `now`/`now + daysToExpiry` → timestamps. A negative `daysToExpiry` yields the expired fixture for the 401 test.
- **Determinism is free**, same as Phase 2: freshly-registered users have no `garmin_tokens`, so `syncIfNeeded(..., {fatalOnMissingTokens:false})` returns without a network call. No Garmin fakes, no `last_synced_at` seeding required. Note `lastUpdatedAt` is then `null` and `refreshAfter` ≈ now — the contract test asserts the field is a valid ISO string (or null for `lastUpdatedAt`), not an exact value.
- **Streak/freeze parity** reuses `consecutiveGoalMetEndingYesterday`: the engine excludes today, so N goal-days ending yesterday ⇒ `streak === N`; a 5-day run earns 1 freeze (max 2), matching `steps.spec.js`. `next_milestone`/`days_to_milestone` follow from `MILESTONES`.

## Risks / Trade-offs

- The `week`/`today` computation uses server-local time; `seed.js` builds dates in the same process-local time on the same machine, so they agree (consistent with Phase 2's midnight-boundary handling). Tests assert relative status, not wall-clock dates.
- Asserting the full field shape risks brittleness if the contract evolves intentionally; that is the point — a contract change should force a test update and a spec delta.
