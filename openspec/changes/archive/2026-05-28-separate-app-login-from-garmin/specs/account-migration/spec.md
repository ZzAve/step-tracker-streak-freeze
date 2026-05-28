## ADDED Requirements

### Requirement: Existing user migration
The system SHALL provide a one-time migration path for users who registered before app-level auth existed (i.e. `password_hash IS NULL`). The user SHALL prove identity by providing their Garmin credentials, then set a new app password. After migration the user SHALL be able to log in with email + app password.

#### Scenario: Successful migration
- **WHEN** a POST to `/api/auth/migrate` is made with a valid Garmin email, valid Garmin password, and a new app password (min 8 chars)
- **THEN** the system verifies the Garmin credentials, bcrypt-hashes the new password, stores it in `password_hash`, and returns 200

#### Scenario: Invalid Garmin credentials
- **WHEN** a POST to `/api/auth/migrate` is made with Garmin credentials that Garmin rejects
- **THEN** the system returns 401 with `{error: "garmin_auth_failed"}`

#### Scenario: Account already migrated
- **WHEN** a POST to `/api/auth/migrate` is made for a user whose `password_hash` is already set
- **THEN** the system returns 409 with `{error: "already_migrated"}`

#### Scenario: Migration triggered from login screen
- **WHEN** a login attempt returns `{error: "no_password"}`
- **THEN** the frontend SHALL display the Garmin credential + new password form and POST to `/api/auth/migrate`
