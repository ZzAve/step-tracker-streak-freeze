## Proposal: Separate App Login from Garmin

### What

Introduce app-level accounts (email + password) that are independent of Garmin authentication. Garmin linking becomes an optional post-login step, not the login mechanism itself.

### Why

The current architecture ties authentication directly to Garmin credentials. This makes it impossible to:
- Add other step-tracker integrations (e.g. Apple Health, Google Fit)
- Implement password reset without Garmin
- Log in if Garmin is down or credentials change

### Target Situation

1. **Self-contained login** — users register and log in with email + bcrypt password
2. **Forgot password** — reset via email link (Resend)
3. **Garmin linking** — after login, users link their Garmin account from a settings page
4. **Link status view** — settings page shows whether Garmin is linked and last sync time
5. **Garmin widget auth** — unchanged (API keys still work as before)

### Non-Goals

- OAuth flows (Google, GitHub, etc.)
- Multiple Garmin accounts per user
- Changing the widget API key mechanism

### Migration Path

Existing users have `garmin_user_id = their-email@example.com`. We copy that into a new `email` column and leave `password_hash` null. On first login attempt, they're guided through a one-time migration: verify via Garmin to prove identity, then set an app password.
