## ADDED Requirements

### Requirement: Explicit deployment file exclusions
The system SHALL declare, in a `.vercelignore` file at the repository root, which
repository files are excluded from the Vercel deployment upload.

#### Scenario: Test files are not deployed
- **WHEN** a deployment is built from the repository
- **THEN** no file matching `*.test.js` is uploaded, at any directory depth

#### Scenario: Non-application directories are not deployed
- **WHEN** a deployment is built from the repository
- **THEN** `docs/`, `garmin-widget/` and `openspec/` are excluded from the upload

### Requirement: Serverless Function count within plan cap
The system SHALL keep the number of emitted Serverless Functions at or below the hosting
plan's per-deployment cap of 12.

#### Scenario: Only real endpoints become functions
- **WHEN** `vercel build` runs against the repository
- **THEN** exactly one function is emitted per non-test `.js` file under `api/`
- **AND** no function is emitted for any `api/**/*.test.js` file

#### Scenario: Deployment succeeds within the cap
- **WHEN** the project is deployed
- **THEN** the emitted function count is 11, which is at or below the cap of 12
- **AND** the deployment does not fail with "No more than 12 Serverless Functions"

### Requirement: Runtime-required files remain deployed
The system SHALL keep files that the application reads at runtime inside the deployment.

#### Scenario: Migrations are available on cold start
- **WHEN** a Serverless Function cold-starts and `node-pg-migrate` runs pending migrations
- **THEN** the `migrations/` directory is present in the deployment

#### Scenario: Frontend assets are served
- **WHEN** a request is served for a page under `public/`
- **THEN** the corresponding file is present in the deployment

### Requirement: Exclusions do not affect testing
The deployment exclusion rules SHALL have no effect on the local or CI test runner.

#### Scenario: Test suite still runs
- **WHEN** `npm test` runs locally or in CI
- **THEN** all test files execute, including those excluded from the deployment
