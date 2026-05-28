## ADDED Requirements

### Requirement: Link Garmin account
The system SHALL allow an authenticated user to link their Garmin account by providing Garmin credentials. The system SHALL verify the credentials via the garmin-connect package and store the resulting session tokens and `garmin_user_id`. A user MAY only have one linked Garmin account.

#### Scenario: Successful link
- **WHEN** an authenticated POST to `/api/auth/garmin/link` is made with valid Garmin email and password
- **THEN** the system stores Garmin tokens and `garmin_user_id` for the user and returns 200

#### Scenario: Invalid Garmin credentials
- **WHEN** an authenticated POST to `/api/auth/garmin/link` is made with credentials rejected by Garmin
- **THEN** the system returns 401 with `{error: "garmin_auth_failed"}`

#### Scenario: Unauthenticated request
- **WHEN** a POST to `/api/auth/garmin/link` is made without a valid session cookie
- **THEN** the system returns 401

### Requirement: Unlink Garmin account
The system SHALL allow an authenticated user to unlink their Garmin account. Unlinking SHALL clear `garmin_user_id` and `garmin_tokens` but SHALL NOT delete the app account or step history.

#### Scenario: Successful unlink
- **WHEN** an authenticated POST to `/api/auth/garmin/unlink` is made
- **THEN** the system sets `garmin_user_id` and `garmin_tokens` to NULL and returns 200

#### Scenario: Unauthenticated request
- **WHEN** a POST to `/api/auth/garmin/unlink` is made without a valid session cookie
- **THEN** the system returns 401

### Requirement: Garmin link status
The system SHALL expose the current Garmin link state for an authenticated user, including whether linked, the Garmin user ID, and the last sync timestamp.

#### Scenario: Linked account
- **WHEN** an authenticated GET to `/api/auth/garmin/status` is made and the user has a linked Garmin account
- **THEN** the system returns `{linked: true, garminUserId: <id>, lastSyncedAt: <iso>}`

#### Scenario: Unlinked account
- **WHEN** an authenticated GET to `/api/auth/garmin/status` is made and the user has no Garmin account linked
- **THEN** the system returns `{linked: false}`

#### Scenario: Unauthenticated request
- **WHEN** a GET to `/api/auth/garmin/status` is made without a valid session cookie
- **THEN** the system returns 401
