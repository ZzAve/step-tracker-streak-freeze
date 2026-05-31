## ADDED Requirements

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
