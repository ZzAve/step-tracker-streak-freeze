## ADDED Requirements

### Requirement: Environment-scoped migration target
The system SHALL run automatic startup migrations against a database that is scoped to the deployment environment, so that migrations triggered by a non-production (preview) deployment do not modify the production database.

#### Scenario: Preview deployment migrates its own database
- **WHEN** a preview deployment cold-starts and runs pending migrations via `initializeDatabase()`
- **THEN** the migrations SHALL execute against the Preview-scoped `DATABASE_URL` (a dedicated preview database branch)
- **AND** the production database SHALL be unaffected

#### Scenario: Production deployment migrates the production database
- **WHEN** a production deployment cold-starts and runs pending migrations
- **THEN** the migrations SHALL execute against the Production-scoped `DATABASE_URL` (the production database branch)

#### Scenario: Per-environment configuration is documented
- **WHEN** a contributor configures deployment environments
- **THEN** the project documentation SHALL describe that `DATABASE_URL` (and `TOKEN_ENCRYPTION_KEY`) are scoped per Vercel environment, with Preview backed by a separate shared database branch
