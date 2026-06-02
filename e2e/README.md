# End-to-end tests (Playwright)

Browser-driven tests that boot the **real app** against a **real local Postgres**
and drive the real `public/` frontend. This is separate from `npm test` (the fast,
fully-mocked unit suite, which needs neither a database nor browser binaries).

Coverage: the **authentication** flow (register → login → logout), the **step
dashboard** (today's steps, streak, weekly grid, freezes), the **widget API
contract**, and the **password-reset** flow (request + execution).

## Prerequisites

1. **Database stack** — Postgres + Neon HTTP proxy via docker-compose:

   ```bash
   docker compose up -d
   ```

   The suite **fails fast** with instructions if the database isn't reachable.
   Migrations are applied automatically before the suite runs (global setup).

2. **Vercel CLI + linked project** — the app is booted with `vercel dev`, which
   needs the project linked (a `.vercel/` directory). If it's missing, run
   `vercel link` once.

3. **Browser binary** (first run only):

   ```bash
   npx playwright install chromium
   ```

## Run

```bash
npm run test:e2e
```

Playwright boots the app itself (via `vercel dev` on port 39817 — override with
`E2E_PORT`), waits for it to be ready, then runs the suite in parallel. A fresh
server is started for each run (`reuseExistingServer: false`); the dedicated,
uncommon port keeps it from colliding with an unrelated dev server.

## Configuration

Test mode is **environment-driven only** — no production source is modified.
Defaults live in [`e2e/env.js`](./env.js) and target the local stack;
override via environment variables:

| Variable         | Default                                                   | Purpose                                              |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`   | `postgres://postgres:postgres@db.localtest.me:5432/main` | Local Postgres; the `localtest.me` host routes queries through the Neon proxy (see `lib/db.js`). |
| `SESSION_SECRET` | `e2e-test-session-secret`                                 | HMAC secret for the signed `session` cookie.         |

## Isolation

Each test registers its **own unique user** (`uniqueEmail()` in
[`e2e/helpers.js`](./helpers.js)), so tests run in parallel without colliding and
without any global database reset. Test users accumulate in the disposable local
database; a cleanup step can be added later if needed.

## Local-date assumption

Date-sensitive tests (step dashboard, widget) compute "today" from the **local**
clock, both when seeding (`e2e/seed.js`) and when asserting, matching how
`lib/streak.js` and the frontend derive today. This holds because the test
runner and the `vercel dev` server share one host and time zone. Two caveats: a
test that crosses **local midnight** mid-run may seed one day and assert another
(rare), and the suite would break if the server ever ran in a different time
zone than the runner (e.g. a UTC-pinned container).
