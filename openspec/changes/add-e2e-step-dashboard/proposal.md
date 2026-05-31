## Why

Phase 1 of the e2e harness (`add-e2e-playwright-harness`) proved the real app boots against a real database and covers authentication. But the app's reason for existing — showing a user their steps, streak, and weekly progress — is still only proven against mocks. The dashboard reads `GET /api/steps`, which assembles today's steps, streak, freezes, and a 7-day status row from `daily_steps` records via the streak engine. Nothing exercises that handler → streak → DB → frontend path end to end. Phase 2 closes that gap with the smallest deterministic slice: seed step data, load the dashboard, assert what the user sees.

A freshly-registered user has no Garmin tokens, so the sync path short-circuits (`maybeSyncSteps` returns `no_garmin`) before any network call. That means the data flow can be exercised deterministically by seeding `daily_steps` directly — no Garmin or Resend fakes, no timestamp manipulation.

## What Changes

- Add a **test-only database seed helper** to the e2e suite that connects to the local Postgres (reusing the existing test DB wiring), resolves a registered test user's id by email, and inserts `daily_steps` rows. It is used only by e2e tests and ships no production code.
- Add **step-dashboard flow coverage** (Phase 2): register → seed `daily_steps` → load the dashboard → assert today's steps, current streak, weekly status row, and available freezes render the seeded values.
- Reuse the Phase 1 patterns (unique-user-per-test isolation, env-only boot, readiness gating). No production code in `api/`, `lib/`, or `public/` changes.
- Garmin sync remains unexercised here by design: coverage relies on the no-Garmin-token short-circuit, not on faking the Garmin edge. Network-level Garmin mocking and an explicit sync flow stay in the roadmap for a later phase.

## Capabilities

### Modified Capabilities
- `e2e-testing`: Adds step-dashboard flow coverage and a parallel-safe per-user step-seeding capability to the existing end-to-end harness.

## Impact

- **No production code changes**: `api/steps.js`, `lib/streak.js`, `lib/sync.js`, and `public/` are exercised as-is.
- **New test tooling**: a test-only seed helper in `e2e/` and a new spec file (`e2e/steps.spec.js`).
- **Same prerequisite as Phase 1**: the Postgres + Neon-proxy `docker-compose` stack running with migrations applied. The seed helper writes directly to that database.
- **Depends on** the Phase 1 harness (`add-e2e-playwright-harness`); does not require it to be archived first.
