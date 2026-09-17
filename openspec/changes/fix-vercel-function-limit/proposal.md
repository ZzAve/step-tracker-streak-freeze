## Why

Production deploys failed with:

> No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.

Vercel turns **every** `.js` file under `api/` into a Serverless Function. There is no
exemption for test files. On `main` that meant:

- 11 real endpoints (`api/apikey.js`, `api/auth/*.js`, `api/steps.js`, `api/widget.js`, …)
- 6 co-located test files (`api/**/*.test.js`)

for a total of **17** functions against a Hobby plan cap of **12**. Nothing in the repo
declared which files were deployable, so the test suite silently consumed half the
function budget.

This was pre-existing on `main`, not introduced by any in-flight branch.

## What Changes

- Add `.vercelignore` (gitignore syntax) declaring what is *not* part of the deployment:
  - `*.test.js` — the actual fix; matches at any depth, so all 6 `api/**/*.test.js` files
    stop becoming functions
  - `docs/`, `garmin-widget/`, `openspec/` — not part of the deployed app; trims upload size
- `migrations/` is deliberately **not** excluded: `node-pg-migrate` reads it on cold start.
- `public/` and `lib/` are untouched apart from `lib/**/*.test.js`, which were never
  functions anyway (only `api/` files are).

`.vercelignore` governs only what is uploaded to Vercel, so `npm test` and CI are unaffected.

## Capabilities

### New Capabilities
- `deployment-packaging`: An explicit declaration of which repository files form the Vercel
  deployment, keeping the Serverless Function count within the hosting plan's cap

### Modified Capabilities
<!-- No product capabilities change; this is deployment packaging only. -->

## Impact

- **No runtime code changes**: one new configuration file
- **Function count**: 17 → 11, one slot under the cap of 12
- **Tests/CI**: unaffected — `.vercelignore` does not influence the local or CI test runner
- **Upload size**: `garmin-widget/`, `docs/` and `openspec/` no longer uploaded
- **No breaking changes** to application behaviour

## Follow-up: consolidate `api/auth/*`

At 11/12 this change leaves a single free slot, so the next new endpoint reintroduces the
failure. The `garmin-client-side-login` work in progress is likely to add one.

The durable fix is route consolidation, a pattern this repo already uses:
`api/auth/garmin/[action].js` collapsed three endpoints into one function.

Applying the same shape to the rest of `api/auth/` would fold six functions into one:

| Today (6 functions) | Proposed (1 function) |
| --- | --- |
| `api/auth/login.js` | `api/auth/[action].js` |
| `api/auth/logout.js` | |
| `api/auth/register.js` | |
| `api/auth/forgot-password.js` | |
| `api/auth/reset-password.js` | |
| `api/auth/migrate.js` | |

Plus `api/apikey.js` + `api/apikey/[id].js` → `api/apikey/[[...id]].js` (optional catch-all),
folding two into one.

Together that takes the deployment from 11 functions to **5**, restoring real headroom
without a Pro plan. Deliberately out of scope here: this change is the minimal unblock for
production, and route consolidation touches request routing and therefore deserves its own
change with its own tests.
