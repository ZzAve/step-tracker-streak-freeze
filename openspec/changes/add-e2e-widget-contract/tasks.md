## 1. API-key seeding helper

- [x] 1.1 Add `seedApiKey(email, plaintextKey, opts)` to `e2e/seed.js`: resolve the user id by email, sha256-hash the plaintext, derive the 8-char prefix, and insert an `api_keys` row — mirroring `api/apikey.js`
- [x] 1.2 Support an expiry option (e.g. `daysToExpiry`, default 365) so a negative/past value produces an expired-key fixture
- [x] 1.3 Make seeding idempotent / parallel-safe per unique plaintext key (each test mints its own key string)

## 2. Widget contract coverage

- [x] 2.1 Add a test: register a fresh user, mint a key via the **real** `POST /api/apikey` (reusing the registration session cookie), and assert that key authenticates against `GET /api/widget?key=` (200)
- [x] 2.2 Add a test (seeded key + seeded steps): assert the full response contract — `streak`, `longest`, `freezes`, `next_milestone`, `days_to_milestone`, `today_steps`, `step_goal===10000`, `week` (7 × `{day,status}`), and ISO `lastUpdatedAt`/`refreshAfter`
- [x] 2.3 Add a test: seed a run of consecutive goal-met days ending yesterday, assert `streak`, `next_milestone`, and `days_to_milestone` match the seeded run
- [x] 2.4 Add a test: seed a 5-day goal-met run, assert `freezes` equals the earned freeze count (parity with Phase 2)
- [x] 2.5 Add a test: seed today's steps, assert `today_steps` matches and the final `week` entry reflects today's goal-met vs pending status
- [x] 2.6 Add tests for the auth-failure contract: missing key → 401 `Missing API key`; invalid key → 401 `Invalid API key`; expired key (seeded past `expires_at`) → 401 `API key expired`

## 3. Verification

- [x] 3.1 Run `e2e/widget.spec.js` with `--repeat-each=2` and confirm green & deterministic
- [x] 3.2 Run the full e2e suite and confirm all specs still green
- [x] 3.3 Confirm `npm test` (unit suite) still runs independently without the database or browser binaries
- [x] 3.4 Run `./node_modules/.bin/openspec validate add-e2e-widget-contract --strict` and fix any issues
