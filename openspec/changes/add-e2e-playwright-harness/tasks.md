## 1. Harness setup

- [ ] 1.1 Add `@playwright/test` as a dev dependency and install its browser binaries
- [ ] 1.2 Create the e2e test directory and a Playwright config that boots the app in test mode (env-only) and waits for a readiness signal before tests run
- [ ] 1.3 Add an npm script to run the e2e suite, separate from `npm test`
- [ ] 1.4 Document the e2e prerequisite (local Postgres + Neon-proxy `docker-compose`, migrations applied) and how to run the suite

## 2. Database and isolation

- [ ] 2.1 Point the app-under-test at the local Postgres via the existing DB-URL env var, with production migrations applied before the suite runs
- [ ] 2.2 Make the suite fail fast with a clear message when the local database is unreachable at start
- [ ] 2.3 Implement a unique-email generator so each test registers its own fresh user (parallel-safe, no global DB reset)

## 3. Authentication flow coverage

- [ ] 3.1 Add a register test: create an account with a fresh unique email and reach the signed-in dashboard
- [ ] 3.2 Add a login test (valid credentials): authenticate and assert the dashboard renders signed-in state
- [ ] 3.3 Add a login test (invalid credentials): assert rejection, signed-out state, and a surfaced error
- [ ] 3.4 Add a logout test: end the session and assert protected views require signing in again

## 4. Verification

- [ ] 4.1 Run the full e2e suite in parallel and confirm it is green and deterministic across repeated runs
- [ ] 4.2 Confirm `npm test` (unit suite) still runs independently without the database or browser binaries
