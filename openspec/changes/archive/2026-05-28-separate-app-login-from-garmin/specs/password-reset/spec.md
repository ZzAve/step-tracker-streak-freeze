## ADDED Requirements

### Requirement: Password reset request
The system SHALL allow users to request a password reset email. The system SHALL always return 200 regardless of whether the email exists to prevent user enumeration. A 32-byte random hex token SHALL be generated, its SHA-256 hash stored in `password_reset_tokens` with a 1-hour TTL, and the raw token sent via Resend email.

#### Scenario: Email exists
- **WHEN** a POST to `/api/auth/forgot-password` is made with a registered email
- **THEN** the system stores a reset token hash and sends a reset email via Resend, returning 200

#### Scenario: Email does not exist
- **WHEN** a POST to `/api/auth/forgot-password` is made with an unregistered email
- **THEN** the system returns 200 without sending any email (anti-enumeration)

#### Scenario: Email delivery failure
- **WHEN** the Resend API call fails
- **THEN** the system logs the error and still returns 200 (silent failure, user can retry)

### Requirement: Password reset execution
The system SHALL allow users to set a new password using a valid, unexpired, unused reset token. On success the system SHALL mark the token as used (set `used_at`) and update `password_hash`.

#### Scenario: Valid token and new password
- **WHEN** a POST to `/api/auth/reset-password` is made with a valid token and a password of at least 8 characters
- **THEN** the system updates `password_hash`, sets `used_at` on the token, and returns 200

#### Scenario: Expired token
- **WHEN** a POST to `/api/auth/reset-password` is made with a token whose `expires_at` is in the past
- **THEN** the system returns 400 with `{error: "token_expired"}`

#### Scenario: Already-used token
- **WHEN** a POST to `/api/auth/reset-password` is made with a token that has a non-null `used_at`
- **THEN** the system returns 400 with `{error: "token_used"}`

#### Scenario: Invalid token
- **WHEN** a POST to `/api/auth/reset-password` is made with a token not found in the database
- **THEN** the system returns 400 with `{error: "invalid_token"}`
