## Context

Phases 1–3 built a Playwright harness that boots the real app against the real local Postgres stack and covers auth, the step dashboard, and the Garmin widget contract. The password-reset flow is the last security-sensitive, fully self-contained user flow without an e2e guard. Its endpoints:

- `POST /api/auth/forgot-password` — looks up the user by lowercased email; if found, generates a 32-byte random token, stores its **sha256 hash** in `password_reset_tokens` (1h expiry), deletes any prior unused tokens for that user, and sends the plaintext by email **best-effort inside a `.catch`**. It **always returns `200`** to prevent user enumeration.
- `POST /api/auth/reset-password` — re-hashes the submitted token, matches it against a row that is unexpired (`expires_at > NOW()`) and unused (`used_at IS NULL`), validates the new password, updates `users.password_hash`, and marks the token `used_at = NOW()`.

The frontend pages are `public/forgot-password.html` and `public/reset-password.html` (token read from the URL query).

## Goals / Non-Goals

**Goals:**
- Prove the request → token → reset → login-with-new-password loop end to end against real code and a real DB.
- Cover the token state machine: valid, expired, already-used, unknown.
- Cover the anti-enumeration guarantee: identical client-observable outcome for registered vs unregistered email, with a DB-level assertion that the token row is (not) created.
- Stay deterministic with no mail server and no production code changes.

**Non-Goals:**
- The `password-reset` spec's "email delivery failure" scenario. The endpoint swallows send failures in a `.catch` and still returns `200`, so failure is not client-observable end to end; asserting it would require mocking `lib/email`, which is a unit concern.
- Exercising real outbound email or a mail-capture service.
- Password-strength rules (owned by `lib/password.js` and its unit tests); a single happy-path strong password is used.

## Decisions

**Seed the reset token rather than read it back.** The endpoint persists only the token's sha256 hash; the plaintext exists only in the (swallowed) email. A test therefore cannot recover a real plaintext token from the DB. Mirroring Phase 3's `seedApiKey`, `seedResetToken(email, plaintextToken, opts)` resolves the user id by email, computes `sha256(plaintextToken)` exactly as `forgot-password.js` does, and inserts the `password_reset_tokens` row directly. The test then drives the **real** `reset-password` endpoint with the known plaintext. *Alternative considered:* reading the most recent token row and reversing it — impossible (one-way hash). *Alternative:* mocking `lib/email` to capture the plaintext — rejected: it modifies the boot path and couples the test to mail internals, violating the env-only, no-production-changes principle.

**Drive the request side through the real endpoint, assert at the DB.** The "registered vs unregistered email" pair is the anti-enumeration guarantee. Since the client response is identical by design, the test asserts the *difference that matters* — a token row created for the registered user, none for the unregistered one — by querying `password_reset_tokens` via the same seed-module DB connection. The valid-reset test uses a seeded token (deterministic) rather than chaining off a request, keeping request-side and execution-side concerns independent.

**Fixtures via options, like Phase 3.** `opts.expiresInMs` (default `3600_000`) with a negative value yields the expired fixture; `opts.usedAt` (a timestamp) yields the already-used fixture. The unknown-token case needs no seed — it submits a random plaintext that was never inserted. Each test mints its own unique plaintext, so seeding is parallel-safe per the existing unique-user isolation.

**Verify the reset took effect by logging in.** The strongest end-to-end assertion is behavioral: after a valid reset, log in with the new password (succeeds) and confirm the old password is rejected. For the rejection cases, assert the reset is refused **and** that the original password still logs in — proving credentials were untouched.

## Risks / Trade-offs

- **`password_reset_tokens` schema drift** → the seed helper hand-writes the same columns `forgot-password.js` uses (`user_id`, `token_hash`, `expires_at`, and `used_at` for the used fixture). If a migration changes those columns the helper must follow; the migration suite and a green e2e run surface this. Mitigation: keep the helper a thin mirror of the endpoint's INSERT, with a comment pointing back to `api/auth/forgot-password.js`.
- **Time-boundary flakiness on expiry** → `reset-password` compares against `NOW()` in the DB while the seed sets `expires_at` from the app process clock. Using a clearly past value (e.g. `-1h`) for the expired fixture and a clearly future value (`+1h`) for valid ones keeps a wide margin, avoiding boundary races (consistent with Phase 2/3's relative-not-wall-clock assertions).
- **Email send attempted during the request-side test** → `sendPasswordResetEmail` runs best-effort; without mail config it rejects and is logged, not thrown, so the endpoint still returns `200`. The test depends only on the `200` + DB row, so this is inert. No mail server is required.
