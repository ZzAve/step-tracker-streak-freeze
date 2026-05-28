## Design: Separate App Login from Garmin

### Key Decisions

**Password hashing: bcryptjs (cost factor 12)**
Pure JS, no native deps, works on Vercel serverless without compilation. Cost factor 12 is the recommended balance of security vs. latency.

**Email delivery: Resend**
Serverless-friendly REST API, generous free tier (3000 emails/month). No SMTP configuration needed. Requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars.

**Reset tokens: 32-byte random hex, SHA-256 hashed in DB**
- Raw token sent to user via email link
- Only the SHA-256 hash stored in DB (single-use, 1-hour TTL)
- On use: `used_at` is set, token cannot be reused

**`garmin_user_id` becomes nullable**
Garmin is now an optional integration. Existing rows keep their value; new registrations start with `NULL`. The `UNIQUE` constraint is retained (one Garmin account per app user).

**Migration: email = garmin_user_id for existing users**
Current `garmin_user_id` values are email addresses. Migration copies them into the new `email` column. Existing users have `password_hash = NULL` until they complete the one-time migration flow.

### Schema Changes

```sql
-- users table
ALTER TABLE users ALTER COLUMN garmin_user_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN email VARCHAR UNIQUE NOT NULL;  -- set from garmin_user_id
ALTER TABLE users ADD COLUMN password_hash VARCHAR;          -- nullable until migrated

-- new table
CREATE TABLE password_reset_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### API Surface

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new app account |
| POST | `/api/auth/login` | App login (email + bcrypt) |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/migrate` | Existing Garmin-only users set app password |
| POST | `/api/auth/garmin/link` | Link Garmin account (authenticated) |
| POST | `/api/auth/garmin/unlink` | Unlink Garmin account |
| GET  | `/api/auth/garmin/status` | Get Garmin link status |

### Security Notes

- Login endpoint uses constant-time compare to prevent user enumeration via timing
- Forgot-password always returns 200 regardless of whether email exists (anti-enumeration)
- Session cookie is HttpOnly, SameSite=Lax, Secure in production (unchanged)
- Reset tokens are single-use (used_at tracked)
- Garmin link/unlink require an active session

### Risks

- **Existing users see "set app password" prompt** — mitigated by clear migration UI
- **Email delivery failure** — silently logged, doesn't break the flow; user can retry
- **APP_URL env var needed** for reset links — document in README/deployment notes
