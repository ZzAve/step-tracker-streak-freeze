## 1. Dependencies

- [ ] 1.1 Add `bcryptjs` to `package.json` dependencies
- [ ] 1.2 Create `lib/email.js` — thin wrapper around Resend REST API for sending password reset emails (no SDK, just `fetch`)

## 2. Database Migration

- [ ] 2.1 Create migration `migrations/009_app_auth.js` — adds `email` (VARCHAR UNIQUE NOT NULL, backfilled from `garmin_user_id`) and `password_hash` (TEXT, nullable initially) to `users`; makes `garmin_user_id` nullable
- [ ] 2.2 Create migration `migrations/010_password_reset_tokens.js` — creates `password_reset_tokens` table with `id, user_id, token_hash, expires_at, used_at, created_at` columns and index on `token_hash`

## 3. App Auth Endpoints

- [ ] 3.1 Rewrite `api/auth/login.js` — replace Garmin credential login with app credential login: look up user by email, verify bcrypt hash, set session cookie; return 401 on failure
- [ ] 3.2 Create `api/auth/register.js` — POST endpoint: validate email + password (min 8 chars), check email uniqueness, bcrypt hash password, insert user row, set session cookie
- [ ] 3.3 Create `api/auth/forgot-password.js` — POST endpoint: look up user by email (always return 200 to avoid enumeration), generate 32-byte random token, store SHA-256 hash in `password_reset_tokens` with 1-hour expiry, send reset email via `lib/email.js`
- [ ] 3.4 Create `api/auth/reset-password.js` — POST endpoint: look up token hash in DB, check expiry and used_at, bcrypt hash new password, update `users.password_hash`, mark token as used

## 4. Garmin Linking Endpoints

- [ ] 4.1 Create `api/auth/garmin/link.js` — POST endpoint (session required): accept `{ email, password }`, authenticate via garmin-connect (reuse logic from old `api/auth/login.js`), store `garmin_user_id` and `garmin_tokens` on the authenticated user row; return 409 if Garmin account already linked to a different user
- [ ] 4.2 Create `api/auth/garmin/unlink.js` — DELETE endpoint (session required): set `garmin_user_id = NULL` and `garmin_tokens = NULL` on the user row
- [ ] 4.3 Create `api/auth/garmin/status.js` — GET endpoint (session required): return `{ linked: bool, garmin_user_id: string|null, last_synced_at: timestamp|null }`

## 5. Data Sync Guard

- [ ] 5.1 Update `lib/sync.js` (or `api/steps.js`) — guard `syncIfNeeded()` to skip sync and return gracefully when `garmin_tokens` is NULL (user hasn't linked Garmin); API response should include `garmin_linked: false` so the frontend can prompt linking

## 6. Migration Path for Existing Users

- [ ] 6.1 Update `api/auth/login.js` — detect migrated users (has `email` but `password_hash IS NULL`), re-verify via Garmin credentials, prompt to set a new password; after Garmin verification succeeds, return a special `{ migrationRequired: true, migrationToken: <short-lived token> }` response instead of a session
- [ ] 6.2 Create `api/auth/complete-migration.js` — POST endpoint: accept `{ migrationToken, newPassword }`, validate token, bcrypt hash password, store on user, issue session cookie

## 7. Frontend — Auth Pages

- [ ] 7.1 Update `public/index.html` — update login form to use app credentials (email + password); add links to "Register" and "Forgot password"; remove Garmin security disclaimer
- [ ] 7.2 Create `public/register.html` — registration form (email, password, confirm password); POST to `/api/auth/register`; redirect to dashboard on success
- [ ] 7.3 Create `public/forgot-password.html` — single email field; POST to `/api/auth/forgot-password`; show confirmation message regardless of outcome
- [ ] 7.4 Create `public/reset-password.html` — reads token from URL query param; shows new-password + confirm fields; POST to `/api/auth/reset-password`; redirect to login on success
- [ ] 7.5 Create `public/migrate.html` — migration completion page: shows "Set your app password" form; uses `migrationToken` from query param; POST to `/api/auth/complete-migration`

## 8. Frontend — Settings / Garmin Linking

- [ ] 8.1 Create `public/settings.html` — settings page showing: logged-in email, Garmin account status (linked/unlinked + garmin_user_id if linked), link/unlink button, link to API keys page; fetches `/api/auth/garmin/status` on load
- [ ] 8.2 Update `public/index.html` dashboard — add navigation link to settings page; show "Link Garmin" prompt in the dashboard when `garmin_linked: false` is returned by `/api/steps`

## 9. Tests

- [ ] 9.1 Add tests for new auth endpoints in `api/auth/` — register, login, forgot-password, reset-password (use existing test pattern from `api/steps.test.js`)
- [ ] 9.2 Add tests for Garmin linking endpoints — link, unlink, status
