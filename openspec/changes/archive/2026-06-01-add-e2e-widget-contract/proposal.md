## Why

Phase 1 (`add-e2e-playwright-harness`) proved the app boots against a real database and covers auth; Phase 2 (`add-e2e-step-dashboard`) proved the `GET /api/steps` → streak → DB → dashboard path the browser uses. But the **Garmin widget** consumes a different endpoint, `GET /api/widget?key={apiKey}`, which returns a compact, widget-specific JSON shape (streak, freezes, milestone countdown, today's steps, a 7-day week row, and cache-control timestamps). Per CLAUDE.md, the MonkeyC/Connect IQ widget itself **cannot be built or tested in CI**. That makes an e2e contract test on `/api/widget` the only automated guard the widget has against silent backend drift.

Like Phase 2, this is exercised deterministically: a freshly-registered user has no Garmin tokens, so `syncIfNeeded` short-circuits before any network call. Seeding `daily_steps` directly drives the streak engine, and an API key is the only new ingredient the widget path needs.

## What Changes

- Add a **test-only API-key seed helper** to `e2e/seed.js` that resolves a registered user by email and inserts an `api_keys` row from a known plaintext key (sha256 hash + prefix + expiry), mirroring `api/apikey.js`. A negative expiry produces an expired-key fixture. Test-only; ships no production code.
- Add **widget-contract flow coverage** (Phase 3) in a new `e2e/widget.spec.js`:
  - One test mints a key via the **real** `POST /api/apikey` (reusing the registration session cookie) and confirms that key authenticates against `GET /api/widget` — proving the real minting→consumption path end to end.
  - The remaining tests seed the key hash directly for speed/determinism and assert the full response contract (field shape and types, `step_goal`, 7-entry `week`, ISO cache timestamps), streak/freeze parity with seeded data, today's-steps and week-tail status, and the three auth-failure cases (missing / invalid / expired key → 401).
- Reuse Phase 1/2 patterns (unique-user-per-test isolation, env-only boot, `consecutiveGoalMetEndingYesterday`/`seedDailySteps`). No production code in `api/`, `lib/`, or `public/` changes.

## Capabilities

### Modified Capabilities
- `e2e-testing`: Adds widget-API contract coverage and a per-user API-key seeding capability to the existing harness.

## Impact

- **No production code changes**: `api/widget.js`, `api/apikey.js`, `lib/streak.js`, and `lib/sync.js` are exercised as-is.
- **New test tooling**: an API-key seed helper added to `e2e/seed.js` and a new spec file (`e2e/widget.spec.js`).
- **Same prerequisite as Phase 1/2**: the Postgres + Neon-proxy `docker-compose` stack running with migrations applied.
- **Depends on** the Phase 1 and Phase 2 harness work (both archived); does not require anything new in production.
