## ADDED Requirements

### Requirement: OAuth 1.0a authentication flow
The system SHALL authenticate users via Garmin Connect OAuth 1.0a. The user SHALL be redirected to Garmin for authorization and returned to the app after granting access.

#### Scenario: User initiates Garmin login
- **WHEN** user clicks "Connect Garmin" on the dashboard
- **THEN** system redirects to Garmin Connect authorization page

#### Scenario: Successful OAuth callback
- **WHEN** Garmin redirects back with valid OAuth verifier
- **THEN** system exchanges for access token, stores token in database, creates session cookie, and redirects to dashboard

#### Scenario: Failed OAuth callback
- **WHEN** Garmin redirects back with an error or user denies access
- **THEN** system shows an error message and allows user to retry

### Requirement: Secure token storage
The system SHALL store Garmin OAuth tokens (token + secret) in Postgres, linked to the user record. Tokens SHALL NOT be exposed to the client.

#### Scenario: Token persistence
- **WHEN** OAuth flow completes successfully
- **THEN** oauth_token and oauth_token_secret are stored in the users table

#### Scenario: Token not leaked to client
- **WHEN** any API response is sent to the browser
- **THEN** the response SHALL NOT contain OAuth tokens

### Requirement: Session management
The system SHALL use secure httpOnly cookies to maintain user sessions.

#### Scenario: Session created on login
- **WHEN** OAuth flow completes successfully
- **THEN** a signed, httpOnly, secure cookie is set identifying the user

#### Scenario: Session used for API requests
- **WHEN** user makes an authenticated API request
- **THEN** system validates the session cookie and identifies the user

#### Scenario: Logout
- **WHEN** user clicks "Logout"
- **THEN** session cookie is cleared and user is redirected to login state

### Requirement: Pull-based step data sync
The system SHALL fetch daily step summaries from Garmin Connect API using stored OAuth tokens. Data SHALL be fetched on page load, with a minimum interval of 1 hour between syncs.

#### Scenario: Sync on page load
- **WHEN** user opens the dashboard and last sync was more than 1 hour ago
- **THEN** system fetches latest daily step data from Garmin and stores in database

#### Scenario: Skip sync if recent
- **WHEN** user opens the dashboard and last sync was less than 1 hour ago
- **THEN** system serves cached data from database without calling Garmin API

### Requirement: Historical data import on first login
The system SHALL fetch available historical daily step data on first login to enable immediate streak calculation.

#### Scenario: First login data import
- **WHEN** user completes OAuth for the first time
- **THEN** system fetches all available historical daily step summaries and stores them in the database
