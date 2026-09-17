## 1. Declare deployment exclusions

- [x] 1.1 Add `.vercelignore` at the repository root excluding `*.test.js`
- [x] 1.2 Also exclude `docs/`, `garmin-widget/` and `openspec/` as non-deployed directories
- [x] 1.3 Confirm `migrations/` is NOT excluded (`node-pg-migrate` reads it on cold start)

## 2. Verification

- [x] 2.1 Simulate the ignore rules against every `api/**/*.js` file: 11 endpoints survive,
      6 test files excluded (17 → 11, cap is 12)
- [x] 2.2 Confirm nothing under `migrations/`, `public/` or `lib/` is wrongly excluded
- [x] 2.3 Run `vercel build`: 11 functions emitted in `.vercel/output/functions`, no test
      files among them
- [x] 2.4 Run `npm test`: 84/84 passing, identical to the pre-change baseline
- [x] 2.5 Confirm the Vercel preview deploy on the PR succeeds — the operation that was
      previously failing in production

## 3. Follow-up (tracked separately, not part of this change)

Route consolidation is the durable fix for the 11/12 headroom this change leaves. It is
deliberately out of scope here — it touches request routing and deserves its own change
with its own tests. Proposed shape:

- Consolidate `api/auth/{login,logout,register,forgot-password,reset-password,migrate}.js`
  into a single `api/auth/[action].js`, mirroring the existing `api/auth/garmin/[action].js`
  pattern (6 functions -> 1)
- Consolidate `api/apikey.js` + `api/apikey/[id].js` into `api/apikey/[[...id]].js`
  (2 functions -> 1)

Together these take the deployment from 11 functions to 5, restoring headroom for new
endpoints such as the `garmin-client-side-login` pairing-code flow.
