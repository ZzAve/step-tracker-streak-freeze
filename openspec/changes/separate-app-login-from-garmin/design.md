## Context

The app currently stores a single user identity per row: `garmin_user_id` (the Garmin email) is the primary identity, and `garmin_tokens` holds the OAuth tokens used for data sync. There is no separate app login — Garmin credentials are the login.

The new model separates two concerns:
1. **App identity** — email + bcrypt-hashed password, used to log in and own data
2. **Garmin integration** — optional linked Garmin account with OAuth tokens, used for step sync

Session management is unchanged: HMAC-SHA256 signed cookies (`lib/session.js`) remain the auth mechanism. Only the credential verification step changes.

## Goals / Non-Goals

**Goals:**
- App accounts that exist independently of Garmin
- Password reset via email
- Garmin account linking/unlinking from within the app
- Visible Garmin integration status page
- Migration path for existing users (Garmin-only accounts)
- Maintain Garmin widget API key authentication unchanged

**Non-Goals:**
- OAuth/SSO login with Google, GitHub, or other providers
- Email verification on registration (welcome email is enough complexity for now)
- Two-factor authentication
- Session revocation or multi-device session management
- Multiple Garmin accounts per user
- Changing email address after registration

## Decisions

### 1. Password hashing with bcrypt
**Choice**: Use `bcryptjs` (pure JS, no native deps) with cost factor 12 to hash passwords.
**Alternative**: `argon2` (more modern, but requires native bindings — problematic on Vercel).
**Rationale**: `bcryptjs` works without native compilation and is well-understood. Cost factor 12 is appropriate for a personal-use app.

### 2. Separate `password_reset_tokens` table
**Choice**: Store reset tokens in a dedicated table: `token_hash TEXT, user_id INT, expires_at TIMESTAMPTZ, used_at TIMESTAMPTZ`.
**Alternative**: Column on `users` table.
**Rationale**: Separate table makes expiry and cleanup straightforward; avoids nulling out the `users` row after each reset. Token is stored as SHA-256 hash of the plaintext token sent to user.

### 3. Email provider: Resend
**Choice**: Use [Resend](https://resend.com) for transactional email (password reset links).
**Alternative**: Nodemailer with SMTP; SendGrid; Postmark.
**Rationale**: Resend has a generous free tier (3,000 emails/month), a minimal REST API with no SDK required (just `fetch`), and is well-suited to serverless functions. No persistent SMTP connection needed.
**Config**: `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `noreply@yourdomain.com`) env vars.

### 4. Reset token format and lifetime
**Choice**: 32-byte random hex token, SHA-256 hashed in DB, valid for 1 hour, single-use.
**Alternative**: JWT with embedded expiry.
**Rationale**: Random token + DB record is simpler to invalidate (mark `used_at`) than JWTs. 1-hour expiry matches industry convention. Single-use prevents replay.

### 5. Migration path for existing Garmin-only users
**Choice**: On first app startup after migration, existing `users` rows have `email = garmin_user_id` and a random temporary `password_hash`. The login page shows a one-time banner: "We've updated our login. Set your password to continue." The user enters their Garmin credentials once more to verify identity and is prompted to choose a new app password.
**Alternative**: Force all users to go through forgot-password flow.
**Rationale**: The verify-then-set-password flow re-uses existing Garmin credential verification (which already works), gives a better UX than sending an unsolicited email, and is a one-time migration. The random temporary password ensures no one can log in without completing the migration.

### 6. `garmin_user_id` becomes nullable
**Choice**: `garmin_user_id` changes from `NOT NULL` to nullable. `garmin_tokens` was already nullable.
**Alternative**: Keep `garmin_user_id NOT NULL`, backfill existing rows on migration.
**Rationale**: New users registered without Garmin should have `NULL` here. The migration backfills `email = garmin_user_id` for all existing rows, making the NOT NULL constraint safe to drop.

### 7. Garmin linking endpoint validates Garmin credentials live
**Choice**: `POST /api/auth/garmin/link` accepts `{ email, password }`, calls `garmin-connect` to authenticate, and stores the resulting tokens — identical to the current login flow but as a separate step.
**Alternative**: Store tokens via a widget-style setup flow.
**Rationale**: Reuses the existing `garmin-connect` auth code in `api/auth/login.js`. The user experience is a simple form in the settings page.

### 8. Frontend: vanilla JS pages, no new framework
**Choice**: New pages (`/register`, `/forgot-password`, `/reset-password`, `/settings`) follow the existing vanilla JS + CSS pattern in `public/`.
**Alternative**: Introduce a lightweight component framework.
**Rationale**: Consistency with existing codebase. These are simple, mostly-static pages with minimal JavaScript.

## Risks / Trade-offs

- **[Resend dependency]** Adding an external email provider adds a failure mode for password reset. → Mitigation: Reset tokens are DB-stored; users can retry. If Resend is down, the reset fails gracefully with an error message.
- **[bcryptjs perf]** bcrypt with cost 12 takes ~250ms per hash. Vercel functions have a 30s timeout, so this is fine. → Note: This is intentional — hashing cost is a security feature.
- **[Migration completeness]** Existing users who never complete the Garmin-verify-then-set-password step will be locked out. → Mitigation: They can always use forgot-password to set a new password via email (since `email = garmin_user_id` for migrated accounts).
- **[Garmin token invalidation]** If a user unlinks Garmin, their stored tokens are deleted. Garmin widget stops syncing until re-linked. → Expected behavior; documented in the settings UI.
- **[Email deliverability]** Resend requires a verified sending domain in production. → Mitigation: Document this as a deployment requirement; dev environment can use Resend's sandbox mode.

## New API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Create a new app account |
| POST | `/api/auth/login` | None | Log in with app credentials |
| POST | `/api/auth/forgot-password` | None | Send password reset email |
| POST | `/api/auth/reset-password` | None | Set new password via reset token |
| GET | `/api/auth/garmin/status` | Session | Get Garmin link status |
| POST | `/api/auth/garmin/link` | Session | Link a Garmin account |
| DELETE | `/api/auth/garmin/unlink` | Session | Unlink Garmin account |

## Database Changes

```sql
-- Migration: Add app credentials to users
ALTER TABLE users
  ADD COLUMN email VARCHAR UNIQUE,
  ADD COLUMN password_hash TEXT;

-- Backfill existing users: email = garmin_user_id
UPDATE users SET email = garmin_user_id WHERE email IS NULL;

-- Make email NOT NULL after backfill
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Make garmin_user_id nullable (was NOT NULL)
ALTER TABLE users ALTER COLUMN garmin_user_id DROP NOT NULL;

-- New table for password reset tokens
CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);
```
