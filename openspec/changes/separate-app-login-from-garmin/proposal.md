## Why

The app currently uses Garmin credentials directly as the app's identity layer. To log in, a user must enter their Garmin email and password — there is no separate app account. This creates a hard coupling between application identity and Garmin membership that blocks future expansion: adding other step-trackers (Fitbit, Apple Health, manual entry) would be impossible without a redesign.

Additionally, users cannot recover access if they lose their Garmin password, and there is no way to use the app without an active Garmin account even if they want to view historical data.

## What Changes

- **New app-level accounts**: Users register and log in with an email + password that is specific to this app (bcrypt-hashed, stored in DB). Garmin credentials are never used for app login again.
- **Garmin account linking**: A logged-in user can link their Garmin account from the settings/profile page by entering their Garmin credentials. The app stores the resulting OAuth tokens, as it does today.
- **Garmin account status view**: A settings page shows whether a Garmin account is linked, the linked Garmin user ID, and allows the user to unlink it.
- **Password reset via email**: A "Forgot password" flow sends a time-limited reset link to the user's registered email address.
- **Existing user migration**: Existing users (who only have a Garmin identity) are given a migration path — they log in once with Garmin credentials to bootstrap their app account, after which Garmin is just a linked integration.
- **Database schema**: The `users` table is updated to carry app credentials (`email`, `password_hash`) and Garmin identity becomes nullable optional columns (`garmin_user_id`, `garmin_tokens`).

## Capabilities

### New Capabilities
- `app-auth`: Independent app authentication — registration, login, and session management using email/password credentials stored in the app's own database.
- `password-reset`: Forgot-password flow that sends a time-limited reset token via email, allowing users to set a new password without Garmin involvement.
- `garmin-account-linking`: Post-login flow for linking a Garmin account to an existing app account by entering Garmin credentials. Stores and manages Garmin OAuth tokens independently of app login.
- `account-settings`: Settings page showing linked integrations (Garmin status, linked ID), with the ability to unlink Garmin.

### Modified Capabilities
- `garmin-oauth`: Now an optional post-login integration rather than the primary login mechanism. Garmin tokens remain stored and used for data sync — only the entry point changes.
- `data-sync`: Sync still reads `garmin_tokens` from the user record; no functional change except that tokens may now be absent (user not linked), in which case sync is skipped rather than blocked.

## Impact

- **API endpoints**: `/api/auth/login` and `/api/auth/register` rewritten for app credentials; new `/api/auth/forgot-password`, `/api/auth/reset-password`, `/api/auth/garmin/link`, `/api/auth/garmin/unlink`, `/api/auth/garmin/status` endpoints added
- **Database**: `users` table gains `email UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`; `garmin_user_id` becomes nullable; new `password_reset_tokens` table
- **Environment variables**: Email provider credentials needed (`EMAIL_FROM`, `SMTP_*` or transactional email API key)
- **Frontend**: Login page updated to app credentials form; new registration page; forgot/reset password pages; Garmin linking section added to a settings/profile page
- **Garmin widget**: No change — widget authentication remains API key based and is unaffected
- **Security**: Passwords stored as bcrypt hashes; reset tokens are single-use, time-limited (1 hour), and stored as SHA-256 hashes
