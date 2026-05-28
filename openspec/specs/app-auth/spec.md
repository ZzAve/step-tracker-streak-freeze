## ADDED Requirements

### Requirement: User registration
The system SHALL allow new users to register with an email address and password. The password SHALL be hashed with bcryptjs at cost factor 12 before storage. On success the system SHALL set a session cookie and return the user's email.

#### Scenario: Successful registration
- **WHEN** a POST to `/api/auth/register` is made with a valid email and password (min 8 chars)
- **THEN** the system creates a user record, sets a session cookie, and returns 200 with `{email}`

#### Scenario: Duplicate email
- **WHEN** a POST to `/api/auth/register` is made with an email already in the `users` table
- **THEN** the system returns 409 with `{error: "email_taken"}`

#### Scenario: Missing or invalid fields
- **WHEN** a POST to `/api/auth/register` is made without an email or with a password shorter than 8 characters
- **THEN** the system returns 400 with a descriptive error

### Requirement: User login
The system SHALL authenticate users by comparing a bcrypt hash of the submitted password against the stored `password_hash`. On success the system SHALL issue a session cookie.

#### Scenario: Successful login
- **WHEN** a POST to `/api/auth/login` is made with a valid email and matching password
- **THEN** the system sets a session cookie and returns 200 with `{email}`

#### Scenario: Wrong password
- **WHEN** a POST to `/api/auth/login` is made with a correct email but wrong password
- **THEN** the system returns 401 with `{error: "invalid_credentials"}`

#### Scenario: Unknown email
- **WHEN** a POST to `/api/auth/login` is made with an email not in the database
- **THEN** the system returns 401 with `{error: "invalid_credentials"}` (same as wrong password to prevent enumeration)

#### Scenario: Unmigrated account (no password_hash)
- **WHEN** a POST to `/api/auth/login` is made for a user whose `password_hash` is NULL
- **THEN** the system returns 401 with `{error: "no_password"}` to trigger the migration flow on the frontend
