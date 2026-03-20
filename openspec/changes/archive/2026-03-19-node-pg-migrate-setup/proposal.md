## Why

Database schema initialization runs on every cold start via `initializeDatabase()` in `lib/db.js`. All `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` statements execute unconditionally, making the setup flaky and untrackable. There is no migration versioning, no history of what has been applied, and adding new schema changes requires modifying a growing monolithic function.

## What Changes

- Add `node-pg-migrate` as a dependency for versioned, Flyway-style database migrations
- Extract all existing schema DDL from `initializeDatabase()` into numbered migration files
- Replace `initializeDatabase()` with a call to the node-pg-migrate runner

## Capabilities

### New Capabilities
- `database-migrations`: Versioned, tracked database migrations using node-pg-migrate with up/down support and migration history table

### Modified Capabilities

## Impact

- **Code**: `lib/db.js` — `initializeDatabase()` rewritten to use migration runner
- **Dependencies**: New dependency `node-pg-migrate`
- **Database**: New `pgmigrations` tracking table created automatically by node-pg-migrate
