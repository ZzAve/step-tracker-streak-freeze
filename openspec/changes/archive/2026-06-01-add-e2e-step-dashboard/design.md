## 1. Context

Phase 2 of the e2e harness. The dashboard (embedded in `public/index.html`) calls `GET /api/steps` on load and renders the result. `api/steps.js` calls `syncIfNeeded(...)`, then `fetchStepsAndStreak(user.id)`, and returns:

```json
{
  "user_email": "...",
  "garmin_linked": false,
  "streak": { "current": 0, "longest": 0, "freeze_count": 0,
              "days_toward_next_freeze": 0, "freezes_used": ["YYYY-MM-DD"] },
  "steps": [ { "date": "YYYY-MM-DD", "steps": 12345, "goal_met": true } ],
  "last_synced_at": null
}
```

`steps` is the user's full set of `daily_steps` rows; the frontend builds a date→row map and renders the current week itself. The goal is to prove the `api/steps` → `lib/streak` → `daily_steps` → frontend path end to end, deterministically, without faking Garmin.

## 2. Goals / Non-Goals

### Goals
- Exercise the real `api/steps` → `lib/streak` → `daily_steps` → frontend path in a browser.
- Make step data deterministic via direct DB seeding, reusing Phase 1 isolation patterns.
- Add no production code; assert on what the user sees, optionally pinning the `GET /api/steps` JSON contract.

### Non-Goals
- No Garmin sync exercise, no network-level Garmin/Resend mocking (deferred to a later phase).
- No CI wiring (tracked in the harness roadmap, implemented separately).
- No assertions on live device step data — the web dashboard renders server-computed step rows, which are fully seedable.

## 3. Decisions

### Determinism via the no-Garmin-token short-circuit
`api/steps.js` calls `syncIfNeeded(user, { fatalOnMissingTokens: false, fatalOnSyncError: false })`. Inside `lib/sync.js`, after the cooldown check, the guard `if (!user.garmin_tokens) return false` skips the Garmin network call entirely. A freshly-registered e2e user has no `garmin_tokens`, so the dashboard load never reaches Garmin — regardless of `last_synced_at`. Therefore seeding `daily_steps` alone is sufficient; we do not need to seed `last_synced_at` or mock the Garmin edge. This is the load-bearing reason Phase 2 is cheap. (`garmin_tokens` is a single TEXT column on `users`; `garmin_linked` in the response is derived from `garmin_user_id`.)

### Seed via direct DB writes, not the API
There is no public endpoint to set step counts (steps only arrive via Garmin sync). The unit suite never touches the DB (`db.sql` is mocked), so no seeding helper exists. Phase 2 adds a test-only helper that opens its own Postgres connection to the same local database the app uses, resolves the user's `id` by email, and upserts `daily_steps (user_id, date, steps, goal_met)` rows (`ON CONFLICT (user_id, date) DO UPDATE`, matching `lib/sync.js`). The app reads back through its normal code path, so the helper proves the real schema and real queries agree.

### Reuse the existing test DB wiring
Phase 1's `e2e/global-setup.js` already connects to the local Postgres for a readiness probe and runs migrations, and `e2e/env.js` sets `NODE_ENV=development` + `DATABASE_URL` so the app wires its DB. The seed helper uses the same connection string/env rather than introducing new configuration.

### Assertion targets (real selectors / fields)
The frontend renders into `public/index.html` (no `app.js`); selectors confirmed there:
- Current streak ← `streak.current` → `#streak-current`
- Longest streak ← `streak.longest` → `#streak-longest`
- Available freezes ← `streak.freeze_count` → `#freeze-count-text` (rendered as `"N / 2"`)
- Weekly row ← `steps[]` → `#days-grid` containing seven `.day-cell` nodes; each has `.day-steps` and a `.day-indicator`, and carries state classes `.today` / `.goal-met` / `.goal-missed` / `.freeze-used` / `.future`
- Today's steps ← the matching `steps[]` row → `.day-cell.today .day-steps`

Tests assert the rendered DOM; where rendering is ambiguous (count-up animation, number formatting like `"12.345"`), they may also assert the `GET /api/steps` JSON (`streak.*`, `steps[]`) to pin the contract.

## 4. Risks / Open Questions

- **Streak-engine coupling:** streak/freeze values depend on `lib/streak.js` rules (10k goal, 1 freeze per 35 goal-days, max 2). Seeded fixtures must be built against the real rules; assertions should target unambiguous fixtures (e.g. N consecutive goal-met days → `streak.current === N`) rather than edge cases, which belong in unit tests.
- **Date boundaries:** "today" and the week window are computed in the app/browser timezone. Seed dates must be derived the same way (relative to the current date) to avoid off-by-one flakiness across midnight.
- **Number formatting:** the UI formats steps (e.g. `12345` → `"12.345"`). DOM assertions must account for formatting, or assert via the JSON contract instead.
