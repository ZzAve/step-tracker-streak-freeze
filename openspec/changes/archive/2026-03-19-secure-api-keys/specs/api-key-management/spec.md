## ADDED Requirements

### Requirement: Create API key
The system SHALL generate a cryptographically random API key, store its SHA-256 hash in the database, and return the plaintext key exactly once. The key SHALL be a 64-character hex string. The system SHALL store the first 8 characters as a prefix for identification. The key SHALL expire 365 days after creation.

#### Scenario: Successful key creation
- **WHEN** an authenticated user creates a new API key with optional name "Garmin Watch"
- **THEN** the system generates a random key, stores its SHA-256 hash with name, prefix, created_at, and expires_at, and returns the plaintext key, id, name, prefix, and expires_at

#### Scenario: Key creation with no name
- **WHEN** an authenticated user creates a new API key without providing a name
- **THEN** the system creates the key with name as NULL and otherwise behaves identically

#### Scenario: Key limit reached
- **WHEN** an authenticated user already has 3 API keys and attempts to create another
- **THEN** the system rejects the request with an error indicating the maximum number of keys has been reached

### Requirement: List API keys
The system SHALL allow users to list their API keys showing only metadata: id, name, prefix, created_at, expires_at, and last_used_at. The system SHALL NOT return the full key or key hash.

#### Scenario: List keys
- **WHEN** an authenticated user requests their API key list
- **THEN** the system returns all keys belonging to that user with id, name, prefix, created_at, expires_at, and last_used_at

#### Scenario: No keys exist
- **WHEN** an authenticated user with no API keys requests their key list
- **THEN** the system returns an empty array

### Requirement: Delete API key
The system SHALL allow users to delete their own API keys by id. The system SHALL NOT allow users to delete keys belonging to other users.

#### Scenario: Delete own key
- **WHEN** an authenticated user deletes an API key that belongs to them
- **THEN** the system removes the key from the database and returns success

#### Scenario: Delete another user's key
- **WHEN** an authenticated user attempts to delete an API key belonging to a different user
- **THEN** the system rejects the request with a not-found or forbidden error

### Requirement: Validate API key
The system SHALL authenticate API requests by hashing the provided key with SHA-256 and looking up the hash in the database. The system SHALL reject expired keys. The system SHALL update last_used_at on successful validation.

#### Scenario: Valid key
- **WHEN** a request includes a valid, non-expired API key
- **THEN** the system hashes the key, finds the matching record, updates last_used_at, and proceeds with the request

#### Scenario: Expired key
- **WHEN** a request includes an API key whose expires_at is in the past
- **THEN** the system returns 401 Unauthorized

#### Scenario: Invalid key
- **WHEN** a request includes an API key that does not match any hash in the database
- **THEN** the system returns 401 Unauthorized

#### Scenario: Missing key
- **WHEN** a request to a key-protected endpoint includes no API key
- **THEN** the system returns 401 Unauthorized

### Requirement: Dedicated API keys page
The system SHALL provide a dedicated page at `/keys` for managing API keys, separate from the main dashboard. The page SHALL include an explanation that API keys are used to integrate with the accompanying Garmin widget (details to be announced). The main dashboard SHALL link to the keys page, and the keys page SHALL link back to the dashboard.

#### Scenario: Navigate to keys page from dashboard
- **WHEN** an authenticated user clicks the API keys link on the dashboard
- **THEN** the system navigates to the `/keys` page showing the key management UI and integration explanation

#### Scenario: Navigate back to dashboard from keys page
- **WHEN** a user on the keys page clicks the dashboard link
- **THEN** the system navigates back to the main dashboard

#### Scenario: Unauthenticated access to keys page
- **WHEN** an unauthenticated user navigates to `/keys`
- **THEN** the system redirects to the login page