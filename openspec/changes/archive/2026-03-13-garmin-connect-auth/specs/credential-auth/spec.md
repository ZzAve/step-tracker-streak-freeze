## ADDED Requirements

### Requirement: Login form with security disclaimer
The system SHALL present a login form with email and password fields for Garmin SSO credentials. The form SHALL display a prominent security disclaimer before the input fields.

#### Scenario: User sees login form
- **WHEN** an unauthenticated user visits the app
- **THEN** the login form is displayed with email and password fields and a visible security disclaimer explaining that credentials are sent to this server, not directly to Garmin

#### Scenario: Disclaimer content
- **WHEN** the login form is rendered
- **THEN** the disclaimer SHALL warn that this is a third-party app, credentials are transmitted to this server for authentication, and recommend using a unique password

### Requirement: Server-side Garmin authentication
The system SHALL authenticate users by sending their Garmin SSO credentials to Garmin's servers via the `garmin-connect` npm package on the server side. Credentials SHALL NOT be stored.

#### Scenario: Successful login
- **WHEN** user submits valid Garmin email and password via POST `/api/auth/login`
- **THEN** the server authenticates with Garmin via garmin-connect, exports the session tokens, stores tokens in the database, creates a session cookie, and returns success

#### Scenario: Invalid credentials
- **WHEN** user submits invalid Garmin credentials
- **THEN** the server returns a 401 error with a message indicating authentication failed

#### Scenario: Garmin service unavailable
- **WHEN** the garmin-connect authentication fails due to a network or service error
- **THEN** the server returns a 502 error indicating Garmin is unreachable

### Requirement: Token persistence and reuse
The system SHALL store garmin-connect session tokens (OAuth1 + OAuth2) as JSON in the database. On subsequent API requests, the system SHALL restore the client session from stored tokens instead of re-authenticating.

#### Scenario: Tokens stored after login
- **WHEN** garmin-connect authentication succeeds
- **THEN** the exported OAuth1 and OAuth2 tokens are stored as JSON in the `garmin_tokens` column of the users table

#### Scenario: Tokens reused for data fetching
- **WHEN** the system needs to fetch step data for an authenticated user
- **THEN** the system loads stored tokens via `client.loadToken()` and makes API calls without requiring the user's password

#### Scenario: Token refresh failure triggers re-login
- **WHEN** stored tokens are expired and cannot be refreshed
- **THEN** the API returns 401, prompting the frontend to show the login form

### Requirement: Session management preserved
The system SHALL continue using signed httpOnly cookies for session management, identical to the existing implementation.

#### Scenario: Session created on login
- **WHEN** garmin-connect authentication succeeds
- **THEN** a signed httpOnly session cookie is set identifying the user

#### Scenario: Logout clears session
- **WHEN** user clicks logout
- **THEN** the session cookie is cleared and the user is returned to the login form
