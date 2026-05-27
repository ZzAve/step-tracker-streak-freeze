## 1. Dependencies

- [x] 1.1 Add `bcryptjs` to `package.json` dependencies
- [x] 1.2 Create `lib/email.js` with Resend-based `sendPasswordResetEmail(email, token)`

## 2. DB Migrations

- [x] 2.1 Migration 008: make `garmin_user_id` nullable, add `email` (UNIQUE NOT NULL) and `password_hash` columns; copy `garmin_user_id` → `email` for existing rows
- [x] 2.2 Migration 009: create `password_reset_tokens` table (id, user_id, token_hash, expires_at, used_at, created_at)

## 3. App Auth Endpoints

- [x] 3.1 Create `api/auth/register.js` — POST, validate email+password, bcrypt hash, insert user, set session cookie
- [x] 3.2 Replace `api/auth/login.js` — POST, look up by email, bcrypt compare, set session; return `no_password` error for unmigrated accounts
- [x] 3.3 Create `api/auth/forgot-password.js` — POST email, generate token, store hash, send reset email; always 200
- [x] 3.4 Create `api/auth/reset-password.js` — POST token+password, verify hash+expiry, update password_hash, mark token used
- [x] 3.5 Create `api/auth/migrate.js` — POST garmin_email+garmin_password+new_password; verify via Garmin, set password_hash for existing account

## 4. Garmin Linking Endpoints

- [x] 4.1 Create `api/auth/garmin/link.js` — POST (authenticated), takes Garmin credentials, verifies via GarminConnect, stores tokens + garmin_user_id
- [x] 4.2 Create `api/auth/garmin/unlink.js` — POST (authenticated), clears garmin_user_id + garmin_tokens
- [x] 4.3 Create `api/auth/garmin/status.js` — GET (authenticated), returns `{linked, garminUserId, lastSyncedAt}`

## 5. Data Sync Guard

- [x] 5.1 Update `api/steps.js` to handle unlinked Garmin gracefully (return steps from DB without sync instead of 400 error)

## 6. Frontend Auth Pages

- [x] 6.1 Create `public/register.html` — email + password + confirm form, links to login
- [x] 6.2 Create `public/forgot-password.html` — email form, success state, link back to login
- [x] 6.3 Create `public/reset-password.html` — reads token from URL, new password + confirm form

## 7. Update Login Page

- [x] 7.1 Update `public/index.html` login section: use app credentials (not "Garmin account"), add "Register" and "Forgot password" links
- [x] 7.2 Add migration flow to `public/index.html`: show Garmin re-verify form when server returns `no_password` error

## 8. Settings Page

- [x] 8.1 Create `public/settings.html` — shows Garmin link status, link/unlink buttons, last sync time; links back to dashboard

## 9. Tests

- [x] 9.1 Add tests for `api/auth/register.js`
- [x] 9.2 Add tests for `api/auth/login.js` (app login)
- [x] 9.3 Add tests for `api/auth/migrate.js`
