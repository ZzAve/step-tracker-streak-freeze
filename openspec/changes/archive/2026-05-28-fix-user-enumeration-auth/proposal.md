## Proposal: Fix User Enumeration in Auth Endpoints

### What

Prevent user enumeration attacks through the `/api/auth/register` and `/api/auth/migrate` endpoints by returning uniform responses regardless of whether an email address has a registered account.

### Why

Both endpoints currently return distinct HTTP status codes that reveal whether an email is registered:

- `register.js` returns `409 "Email already registered"` for known emails — an attacker POSTing candidate emails can confirm account existence via the 409 vs non-409 distinction
- `migrate.js` returns `404 "No account found for this email"` for unknown emails — same enumeration vector

`forgot-password.js` already follows the correct pattern (`// Always 200 to prevent user enumeration`). The same protection must be applied consistently across all auth endpoints.

### Target Situation

1. `register.js` returns `200 { ok: true }` whether or not the email is already registered — a duplicate registration silently succeeds from the caller's perspective
2. `migrate.js` returns `401 "Invalid Garmin credentials"` when no account is found — this is indistinguishable from a wrong Garmin password, so the enumeration signal is eliminated
3. Frontend `register.html` removes the dead error-message branch that checked for the now-gone 409 body
4. Tests updated to match the new response codes

### Non-Goals

- Sending notification emails to existing users on duplicate register attempts (out of scope; can be added later)
- Changing any other auth endpoints
