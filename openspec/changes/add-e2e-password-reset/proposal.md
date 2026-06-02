## Why

Phase 1 (`add-e2e-playwright-harness`) proved the app boots against a real database and covers auth; Phase 2 (`add-e2e-step-dashboard`) and Phase 3 (`add-e2e-widget-contract`) proved the read paths the browser and Garmin widget consume. The **password-reset flow** (`POST /api/auth/forgot-password` → `POST /api/auth/reset-password`, driven from `public/forgot-password.html` and `public/reset-password.html`) is the one remaining security-sensitive, self-contained user flow with no automated end-to-end guard. Its correctness is stateful — a hashed, single-use, time-boxed token in `password_reset_tokens` — and it carries an explicit anti-enumeration guarantee, exactly the kind of wired-together behavior unit mocks can't prove.

The flow is deterministic without any mail server: `forgot-password` sends the email best-effort inside a `.catch` and always returns `200`, so the suite never depends on outbound mail. Because the endpoint stores only the **sha256 hash** of the token (the plaintext leaves only by email), a test cannot recover the plaintext from the DB — so, mirroring Phase 3's `seedApiKey`, the reset side is driven from a **seeded known token**, with expiry and `used_at` options producing the expired and already-used fixtures.

## What Changes

- Add a **test-only reset-token seed helper** to `e2e/seed.js`: `seedResetToken(email, plaintextToken, opts)` resolves a registered user by email, sha256-hashes a known plaintext token, and inserts a `password_reset_tokens` row — mirroring `api/auth/forgot-password.js`. An expiry option (default 1h) with a past value produces an expired-token fixture; a `usedAt` option produces an already-used fixture. Test-only; ships no production code.
- Add **password-reset flow coverage** (Phase 4) in a new `e2e/password-reset.spec.js`:
  - **Request side** (real `forgot-password.html` / `POST /api/auth/forgot-password`): requesting a reset for a registered email returns `200` and creates exactly one unused token row for that user; requesting for an unregistered email also returns `200` and creates no row (anti-enumeration parity, no observable difference to the client).
  - **Execution side** (real `reset-password.html` / `POST /api/auth/reset-password`, seeded token): a valid token + new password succeeds, after which login with the new password works and the old password is rejected — the end-to-end proof. Expired token, already-used token, and invalid (unknown) token are each rejected and leave credentials unchanged.
- Reuse Phase 1/2/3 patterns: unique-user-per-test isolation, env-only boot, registration via existing helpers. No production code in `api/`, `lib/`, or `public/` changes.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `e2e-testing`: Adds password-reset flow coverage and a per-user reset-token seeding capability to the existing harness.

## Impact

- **No production code changes**: `api/auth/forgot-password.js`, `api/auth/reset-password.js`, `lib/password.js`, and `lib/db.js` are exercised as-is.
- **New test tooling**: a reset-token seed helper added to `e2e/seed.js` and a new spec file (`e2e/password-reset.spec.js`).
- **Same prerequisite as Phase 1/2/3**: the Postgres + Neon-proxy `docker-compose` stack running with migrations applied (the `password_reset_tokens` table ships in `migrations/`).
- **Depends on** the Phase 1/2/3 harness work (all archived); does not require anything new in production. The `password-reset` spec's "email delivery failure" scenario is intentionally out of scope here — the endpoint swallows send failures and is not client-observable end-to-end.
