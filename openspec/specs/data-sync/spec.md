## MODIFIED Requirements

### Requirement: Pull-based step data sync
The system SHALL fetch daily step counts using the garmin-connect package's `getSteps(date)` method. Data SHALL be fetched on page load, with a minimum interval of 1 hour between syncs. Since `getSteps()` returns a single day's total, the system SHALL iterate over the required date range.

#### Scenario: Sync on page load
- **WHEN** user opens the dashboard and last sync was more than 1 hour ago
- **THEN** system creates a garmin-connect client, loads stored tokens, fetches steps for each day since last sync via `getSteps(date)`, and stores results in the database

#### Scenario: Skip sync if recent
- **WHEN** user opens the dashboard and last sync was less than 1 hour ago
- **THEN** system serves cached data from database without calling Garmin

#### Scenario: Token failure during sync
- **WHEN** garmin-connect client fails to authenticate with stored tokens during sync
- **THEN** system returns 401 so the frontend prompts re-login

### Requirement: Historical data import on first login
The system SHALL fetch available historical daily step data on first login to enable immediate streak calculation. The system SHALL iterate over up to 365 days using `getSteps(date)` for each day.

#### Scenario: First login data import
- **WHEN** user logs in for the first time (no existing step data)
- **THEN** system fetches daily step counts for the past 365 days and stores them in the database
