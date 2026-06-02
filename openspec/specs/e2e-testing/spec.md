# e2e-testing Specification

## Purpose
Browser-driven end-to-end testing that boots the real app against a real local database, with external integrations redirected at the network edge, proving the system works wired together rather than only in mocked units. Coverage is built up in phases, isolated per test by unique user.
## Requirements
### Requirement: End-to-end test harness boots the real app

The system SHALL provide a Playwright Test harness that boots a real instance of the app and drives the real frontend in a headless browser. The app under test SHALL be configured into test mode exclusively through environment variables, with no changes to production code paths.

#### Scenario: Harness starts the app and runs a test
- **WHEN** the e2e suite is invoked
- **THEN** the harness boots the app, waits for a readiness signal before any test runs, and tears the app down after the run completes

#### Scenario: Test mode is environment-driven only
- **WHEN** the app is booted for e2e tests
- **THEN** all test-specific configuration is supplied via environment variables and no production source file is branched or modified to enable testing

### Requirement: Tests run against a real local database

The e2e suite SHALL run against a real local Postgres database (the existing Neon-proxy `docker-compose` stack) with production migrations applied, so the schema under test matches production.

#### Scenario: Migrations applied before tests
- **WHEN** the e2e suite starts against the local database
- **THEN** production migrations have been applied so the schema matches production

#### Scenario: Database unreachable
- **WHEN** the required local database is not reachable at suite start
- **THEN** the suite fails fast with a clear message identifying the missing database prerequisite

### Requirement: Tests are isolated by unique user per test

Each e2e test SHALL operate on its own freshly-registered user with a unique email, so tests can run in parallel without contaminating each other and without any global database reset.

#### Scenario: Parallel tests do not collide
- **WHEN** multiple e2e tests run in parallel
- **THEN** each test registers and acts on its own unique user, and no test observes another test's data

#### Scenario: No global reset between tests
- **WHEN** one test completes and another begins
- **THEN** the suite does not reset or wipe the shared database to achieve isolation

### Requirement: Authentication flows are covered end-to-end

The e2e suite SHALL cover the registration, login, and logout flows by driving the real frontend, asserting on rendered state rather than pixel snapshots.

#### Scenario: Register a new account
- **WHEN** a test registers with a fresh unique email and password through the UI
- **THEN** the account is created and the user reaches the signed-in dashboard

#### Scenario: Log in with valid credentials
- **WHEN** a registered user submits their correct email and password through the UI
- **THEN** the user is authenticated and the dashboard renders their signed-in state

#### Scenario: Log in with invalid credentials
- **WHEN** a user submits an incorrect password through the UI
- **THEN** authentication is rejected and the user remains signed out with an error surfaced in the UI

#### Scenario: Log out
- **WHEN** a signed-in user logs out through the UI
- **THEN** the session ends and protected views are no longer accessible without signing in again

### Requirement: E2E suite is separate from the unit suite

The e2e suite SHALL be runnable via its own command, distinct from the existing `npm test` unit run, so the fast unit suite is unaffected by e2e prerequisites.

#### Scenario: Run e2e without affecting unit tests
- **WHEN** a developer runs the e2e command
- **THEN** the Playwright e2e suite runs independently of `npm test`, which continues to run the unit suite without requiring the database or browser binaries

### Requirement: Per-user step data seeding

The end-to-end suite SHALL be able to seed step data for a specific test user directly into the real database, so dashboard behavior can be exercised deterministically without depending on external step sources.

#### Scenario: Seeded step data is readable by the application

- WHEN a test seeds daily step records for a registered user
- THEN those records are written to the real database for that user
- AND a subsequent application read for that user returns the seeded step values

#### Scenario: Seeding is isolated per user

- WHEN multiple tests seed step data in parallel, each for its own unique user
- THEN each user's seeded data is independent
- AND no test observes step data seeded by another test

#### Scenario: No external step source is contacted

- WHEN a test seeds step data for a user that has no linked external step provider
- THEN the application serves the dashboard from the seeded data
- AND no external step-provider network call is made

### Requirement: Step dashboard flow coverage

The end-to-end suite SHALL cover the signed-in step dashboard, asserting that seeded step data is rendered to the user as today's steps, streak, weekly status, and available freezes.

#### Scenario: Dashboard shows today's seeded steps

- WHEN a signed-in user with seeded step data for today loads the dashboard
- THEN the dashboard displays today's step count matching the seeded value

#### Scenario: Dashboard shows the streak derived from seeded data

- WHEN a signed-in user has seeded step data forming a run of consecutive goal-met days
- THEN the dashboard displays a current streak consistent with that run

#### Scenario: Dashboard shows the weekly status row

- WHEN a signed-in user with seeded step data for the past several days loads the dashboard
- THEN the dashboard displays a seven-day status row
- AND each day reflects whether the seeded steps met the goal

#### Scenario: Dashboard shows available freezes

- WHEN a signed-in user loads the dashboard
- THEN the dashboard displays the number of available streak freezes derived from the seeded data

### Requirement: Per-user API-key seeding

The end-to-end suite SHALL be able to provision an API key for a specific test user directly in the real database, so the widget endpoint can be exercised deterministically with a key whose plaintext the test already knows.

#### Scenario: Seeded API key authenticates the widget endpoint

- WHEN a test seeds an API key for a registered user
- THEN a request to the widget endpoint using that key's plaintext is authenticated as that user
- AND the response reflects that user's seeded step data

#### Scenario: Seeded API key can be expired on demand

- WHEN a test seeds an API key with an expiry in the past
- THEN a request to the widget endpoint using that key is rejected as expired

#### Scenario: Seeding is isolated per user

- WHEN multiple tests seed API keys in parallel, each for its own unique user
- THEN each key authenticates only its own user
- AND no test observes another test's key or data

### Requirement: Widget API contract coverage

The end-to-end suite SHALL cover the widget endpoint that the external device widget consumes, asserting both the real key-minting path and the full response contract derived from seeded data.

#### Scenario: A minted key authenticates the widget endpoint

- WHEN a registered user mints an API key through the real key-creation endpoint
- THEN that key authenticates a subsequent request to the widget endpoint
- AND the widget endpoint returns a successful response

#### Scenario: Widget response matches the published contract

- WHEN an authenticated request is made to the widget endpoint for a user with seeded step data
- THEN the response includes the current streak, longest streak, available freezes, next milestone and days remaining to it, today's steps, the step goal, a seven-entry week status row, and cache-control timestamps
- AND each field has the type and shape the device widget depends on

#### Scenario: Widget streak and freezes match seeded data

- WHEN the widget endpoint is requested for a user whose seeded step data forms a known run of consecutive goal-met days
- THEN the reported streak, milestone countdown, and freeze count are consistent with that run

#### Scenario: Widget today's steps and week tail reflect seeded data

- WHEN the widget endpoint is requested for a user with seeded step data for today
- THEN the reported today's steps match the seeded value
- AND the final entry of the week status row reflects whether today's seeded steps met the goal

#### Scenario: Widget rejects missing, invalid, and expired keys

- WHEN the widget endpoint is requested without a key, with an unknown key, or with an expired key
- THEN the request is rejected as unauthorized
- AND the response distinguishes the missing, invalid, and expired cases

