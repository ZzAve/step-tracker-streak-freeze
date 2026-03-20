## ADDED Requirements

### Requirement: Versioned migration files
The system SHALL manage database schema changes through individually versioned SQL migration files stored in a `migrations/` directory.

#### Scenario: Migration files exist for all current schema
- **WHEN** the migration files are listed
- **THEN** there SHALL be individual migration files that collectively produce the current schema (users, daily_steps, streaks tables with all columns)

#### Scenario: Each migration has up and down
- **WHEN** a migration file is created
- **THEN** it SHALL contain both `-- Up Migration` and `-- Down Migration` sections

### Requirement: Migration tracking
The system SHALL track which migrations have been applied using a database table managed by node-pg-migrate.

#### Scenario: Migration runs only once
- **WHEN** a migration has already been applied
- **AND** `initializeDatabase()` is called again
- **THEN** the migration SHALL NOT be re-executed

#### Scenario: New migration is applied
- **WHEN** a new migration file exists that has not been applied
- **AND** `initializeDatabase()` is called
- **THEN** the migration SHALL be executed and recorded as applied

### Requirement: Startup migration execution
The system SHALL run pending migrations automatically during application startup via `initializeDatabase()`.

#### Scenario: Clean startup with no pending migrations
- **WHEN** the application starts and all migrations are already applied
- **THEN** startup SHALL complete without executing any migrations

#### Scenario: Startup with pending migrations
- **WHEN** the application starts and there are unapplied migrations
- **THEN** all pending migrations SHALL be applied in order before the application accepts requests

