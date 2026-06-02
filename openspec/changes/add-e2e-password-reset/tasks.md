## 1. Reset-token seeding helper

- [x] 1.1 Add `seedResetToken(email, plaintextToken, opts)` to `e2e/seed.js`: resolve the user id by lowercased email, compute `sha256(plaintextToken)`, and insert a `password_reset_tokens` row — mirroring `api/auth/forgot-password.js`
- [x] 1.2 Support `opts.expiresInMs` (default 3600000) so a negative/past value produces an expired-token fixture
- [x] 1.3 Support `opts.usedAt` (timestamp) to produce an already-used-token fixture
- [x] 1.4 Add a small DB read helper (e.g. `countResetTokens(email)`) so the request-side tests can assert token-row creation; keep it test-only and parallel-safe per unique user

## 2. Request-side coverage

- [x] 2.1 Add a test: register a fresh user, request a reset via `forgot-password.html` (real `POST /api/auth/forgot-password`), assert a generic success and exactly one unused token row for that user
- [x] 2.2 Add a test: request a reset for an unregistered unique email, assert the same generic success and that no token row is created (anti-enumeration parity)

## 3. Execution-side coverage

- [x] 3.1 Add a test: seed a valid token, submit it with a new password via `reset-password.html` (real `POST /api/auth/reset-password`), assert success, then assert login with the new password succeeds and login with the old password is rejected
- [x] 3.2 Add a test: seed an expired token (past `expires_at`), submit a new password, assert rejection and that the original password still logs in
- [x] 3.3 Add a test: seed an already-used token (`used_at` set), submit a new password, assert rejection and that the original password still logs in
- [x] 3.4 Add a test: submit an unknown (never-seeded) random token, assert rejection and that the original password still logs in

## 4. Verification

- [x] 4.1 Run `e2e/password-reset.spec.js` with `--repeat-each=2` and confirm green & deterministic
- [x] 4.2 Run the full e2e suite and confirm all specs still green
- [x] 4.3 Confirm `npm test` (unit suite) still runs independently without the database or browser binaries
- [x] 4.4 Run `./node_modules/.bin/openspec validate add-e2e-password-reset --strict` and fix any issues
