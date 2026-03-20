## MODIFIED Requirements

### Requirement: Pull-based step data sync
The system SHALL fetch daily step counts using the garmin-connect package's range endpoint via `fetchDailySteps()`. Data SHALL be fetched on page load, with a minimum interval of 1 hour between syncs. The range endpoint returns multiple days per request (up to 28 days per chunk), so the system SHALL chunk longer ranges accordingly.

#### Scenario: Sync on page load
- **WHEN** user opens the dashboard and last sync was more than 1 hour ago
- **THEN** system creates a garmin-connect client, loads stored tokens, fetches steps from last recorded date to today via the range endpoint (28-day chunks), and upserts results in the database

#### Scenario: Skip sync if recent
- **WHEN** user opens the dashboard and last sync was less than 1 hour ago
- **THEN** system serves cached data from database without calling Garmin

#### Scenario: Token failure during sync
- **WHEN** garmin-connect client fails to authenticate with stored tokens during sync
- **THEN** system returns 401 so the frontend prompts re-login

#### Scenario: Widget authentication via hashed key
- **WHEN** the Garmin widget requests step data with an API key
- **THEN** system validates the key by SHA-256 hashing it, looking up the hash in the api_keys table, checking expiration, and updating last_used_at before returning data