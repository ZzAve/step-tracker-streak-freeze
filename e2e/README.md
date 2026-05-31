# End-to-end tests (Playwright)

Browser-driven tests that boot the **real app** against a **real local Postgres**
and drive the real `public/` frontend. This is separate from `npm test` (the fast,
fully-mocked unit suite, which needs neither a database nor browser binaries).

Phase 1 covers the authentication flow: **register → login → logout**.

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

Playwright boots the app itself (via `vercel dev` on port 3000), waits for it to
be ready, then runs the suite in parallel. If a dev server is already running on
3000 it is reused (locally).

## Configuration

Test mode is **environment-driven only** — no production source is modified.
Defaults live in [`e2e/test-env.js`](./test-env.js) and target the local stack;
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
