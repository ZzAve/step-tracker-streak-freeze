## ADDED Requirements

### Requirement: Per-user reset-token seeding

The end-to-end suite SHALL be able to seed a password-reset token for a specific test user directly into the real database, so the reset-execution flow can be exercised deterministically without sending or reading email.

#### Scenario: Seeded token authenticates the reset endpoint

- **WHEN** a test seeds a known plaintext reset token for a registered user with a future expiry
- **THEN** the token's sha256 hash is written to the real database for that user
- **AND** submitting the known plaintext token to the real reset endpoint is accepted

#### Scenario: Expired-token fixture

- **WHEN** a test seeds a reset token with a past expiry
- **THEN** submitting that token to the real reset endpoint is rejected as invalid or expired

#### Scenario: Already-used-token fixture

- **WHEN** a test seeds a reset token marked as already used
- **THEN** submitting that token to the real reset endpoint is rejected

#### Scenario: Seeding is isolated per user

- **WHEN** multiple tests seed reset tokens in parallel, each for its own unique user with a distinct plaintext token
- **THEN** each user's token is independent
- **AND** no test's token validates against another test's user

### Requirement: Password-reset flow coverage

The end-to-end suite SHALL cover the password-reset flow by driving the real frontend and real endpoints, asserting on rendered and database-observable state rather than on outbound email.

#### Scenario: Reset request for a registered email

- **WHEN** a test requests a password reset through the UI for a registered email
- **THEN** the request succeeds with a generic acknowledgement
- **AND** exactly one unused reset token exists for that user in the database

#### Scenario: Reset request does not enumerate users

- **WHEN** a test requests a password reset through the UI for an email that is not registered
- **THEN** the request succeeds with the same generic acknowledgement as for a registered email
- **AND** no reset token is created

#### Scenario: Reset with a valid token changes the password

- **WHEN** a signed-out user submits a valid seeded reset token with a new password through the UI
- **THEN** the password is changed
- **AND** the user can subsequently log in with the new password
- **AND** the user can no longer log in with the old password

#### Scenario: Reset with an expired token is rejected

- **WHEN** a user submits an expired seeded reset token with a new password
- **THEN** the reset is rejected
- **AND** the user's existing credentials remain unchanged

#### Scenario: Reset with an already-used token is rejected

- **WHEN** a user submits a reset token that has already been used
- **THEN** the reset is rejected
- **AND** the user's existing credentials remain unchanged

#### Scenario: Reset with an unknown token is rejected

- **WHEN** a user submits a reset token that does not exist in the database
- **THEN** the reset is rejected
- **AND** no user's credentials are changed
