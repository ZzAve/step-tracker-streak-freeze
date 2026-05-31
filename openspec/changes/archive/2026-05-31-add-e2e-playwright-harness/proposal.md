## Why

The app has ~100 unit tests, but every one talks to mocks: `db.sql()` is stubbed, Garmin and Resend are stubbed, and nothing ever boots a real server. The pieces are proven in isolation but never proven *wired together*, which makes real bugs (handler → sync → streak → DB mismatches, contract drift) hard to catch and erodes trust in the suite. We need browser-driven, end-to-end tests that run the real app against a real database. This change establishes that harness with the smallest vertical slice — authentication — that needs no external fakes.

## What Changes

- Introduce a Playwright Test suite that drives the real `public/` frontend in a headless browser against a locally-running instance of the app.
- The app under test boots in a test configuration via environment variables only; **no production logic changes** — only its external edges are redirected.
- Tests run against a **real local Postgres** (the existing Neon-proxy `docker-compose` stack) with migrations applied, so schema matches production.
- **Test isolation by unique-user-per-test**: each test registers its own fresh email, so tests run in parallel with no global DB reset.
- First-cut flow coverage (Phase 1): register → login → logout. These flows touch only the real DB — no Garmin or Resend fakes are built in this change.
- Add an npm script to run the e2e suite, kept separate from the existing `npm test` unit run.
- The broader roadmap (Garmin sync, widget/API contract, failure injection, password reset) is documented in `design.md` but **out of scope** for this change; each later phase is its own change.

## Capabilities

### New Capabilities
- `e2e-testing`: Browser-driven end-to-end test harness that boots the real app against a real local database with external integrations redirected at the network edge, plus its first flow coverage (authentication: register, login, logout) and parallel-safe unique-user-per-test isolation.

### Modified Capabilities
<!-- None. This change adds test infrastructure only; no existing spec's requirements change. -->

## Impact

- **New dev dependency**: `@playwright/test` (and its managed browser binaries), used only for e2e runs — not in the production bundle.
- **New test tooling**: an e2e test directory, a Playwright config that boots the app and waits for readiness, and an npm script to invoke it.
- **Local/CI prerequisite**: the e2e suite requires the Postgres + Neon-proxy `docker-compose` stack running with migrations applied. CI wiring for the e2e job is noted in the roadmap but not required to land Phase 1.
- **No changes** to `api/`, `lib/`, or `public/` production code in this phase; authentication flows are exercised as they already exist.
