## Why

Migrations run automatically on cold start via `initializeDatabase()` → `runMigrations()` against whatever `process.env.DATABASE_URL` points to. Today a single `DATABASE_URL` is shared across the Vercel Production and Preview environments, so a **preview deployment runs its migrations against the production database**. A schema change merged to a preview branch (e.g. migration `010` converting `garmin_tokens` from JSONB to TEXT) therefore mutates production before it is ever promoted — the exact cross-environment leak we want to prevent.

The codebase already supports the fix without a code change: `lib/db.js` reads `process.env.DATABASE_URL` directly and only overrides it when `NODE_ENV === 'development'` (local Docker). Vercel preview deployments run with `NODE_ENV=production`, so they honour whatever `DATABASE_URL` is scoped to the Preview environment. The gap is purely **documentation**: the per-environment scoping convention is not written down, so it is easy to misconfigure.

## What Changes

- Document the convention that database-backing env vars (`DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`) are **scoped per Vercel environment**: Production points at the production Neon branch; Preview points at a single shared, persistent Neon `preview` branch.
- Document that preview deployments may share one preview branch with each other (acceptable), and that this isolates preview migrations from production.
- Add a "Environments" subsection to the README Deployment section and per-environment notes to `.env.example`.
- **No application code changes.**

## Capabilities

### New Capabilities

### Modified Capabilities
- `database-migrations`: Add a requirement that automatic startup migrations target a database scoped to the deployment environment, so preview migrations never touch the production database.

## Impact

- **Docs**: `README.md` (new Environments subsection), `.env.example` (per-environment scoping notes)
- **Code**: none
- **Operational**: requires a one-time Vercel + Neon configuration (separate Preview-scoped `DATABASE_URL` backed by a shared Neon `preview` branch); captured in tasks as a manual step
