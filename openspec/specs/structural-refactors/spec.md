## ADDED Requirements

### Requirement: Structured logging via pino
The system SHALL use a centralized `lib/logger.js` module backed by the `pino` library for all server-side logging. Log level SHALL be configurable via the `LOG_LEVEL` environment variable, defaulting to `info`.

#### Scenario: Structured log output
- **WHEN** any API endpoint or library module produces log output
- **THEN** it uses the shared `logger` instance (not `console.log`/`console.error`)

#### Scenario: Log level configuration
- **WHEN** `LOG_LEVEL` is set to `debug`
- **THEN** debug-level messages (sync cooldown checks, DB query counts, etc.) are included in output

### Requirement: Extracted sync module
The system SHALL encapsulate all Garmin data synchronization logic in a dedicated `lib/sync.js` module. This module SHALL export a `syncIfNeeded(user, options)` function that handles cooldown checking, historical vs incremental sync, step upserting, and token persistence.

#### Scenario: Sync cooldown
- **WHEN** `syncIfNeeded` is called and the user's `last_synced_at` is less than 1 hour ago
- **THEN** it returns `false` without contacting Garmin

#### Scenario: Fatal vs non-fatal error modes
- **WHEN** `syncIfNeeded` is called with `{ fatalOnSyncError: false }`
- **THEN** Garmin fetch errors are caught, logged, and `false` is returned (no throw)
- **WHEN** `syncIfNeeded` is called with `{ fatalOnSyncError: true }` (default)
- **THEN** Garmin fetch errors propagate to the caller

#### Scenario: Historical import detection
- **WHEN** `syncIfNeeded` runs and no `daily_steps` rows exist for the user
- **THEN** it fetches the past 60 days (defined by `HISTORICAL_DAYS` constant)
- **WHEN** existing rows are found
- **THEN** it fetches from the most recent recorded date to today

### Requirement: Garmin widget settings directory structure
The Connect IQ widget SHALL organize resource files with settings in a `resources/settings/` subdirectory, containing `properties.xml` (app properties/defaults) and `settings.xml` (user-facing settings UI definition).

#### Scenario: Settings file layout
- **GIVEN** the Garmin widget project
- **THEN** `resources/settings/properties.xml` defines property defaults (`apiKey`, `apiUrl`)
- **AND** `resources/settings/settings.xml` defines the Connect IQ settings UI
- **AND** `resources/properties.xml` is removed (consolidated into `resources/settings/`)