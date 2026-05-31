## Context

`lib/db.js` resolves the database connection like this:

```js
let connectionString = process.env.DATABASE_URL;
if (process.env.NODE_ENV === 'development') {
  connectionString = 'postgres://postgres:postgres@db.localtest.me:5432/main';
  // ...neon proxy config for local Docker
}
```

Migrations run on cold start through `initializeDatabase()` → `runMigrations()` against `connectionString`. There is no per-environment awareness in the code — it trusts the injected `DATABASE_URL`.

On Vercel:
- Environment variables can hold **different values per environment scope** (Production / Preview / Development) for the same key.
- Preview and Production deployments both run with `NODE_ENV=production`; only `VERCEL_ENV` differs (`preview` vs `production`). So the `NODE_ENV === 'development'` override never fires on Vercel, and the injected `DATABASE_URL` is used verbatim.

The problem is configuration, not code: a single `DATABASE_URL` applied to both Production and Preview means preview migrations hit production.

## Goals / Non-Goals

**Goals**
- Document the per-environment scoping convention so production is never migrated by a preview deployment.
- Keep the model simple: one shared, persistent Neon `preview` branch for all previews.

**Non-Goals**
- No code changes to `lib/db.js` or the migration runner.
- Not adopting ephemeral per-PR database branches (a single shared preview branch is sufficient; previews interfering with each other is acceptable).
- Not adding an automated guard that blocks migrations against production from a non-production deployment (tracked separately if desired).

## Decisions

### Decision: Scope `DATABASE_URL` per Vercel environment, backed by a shared Neon `preview` branch
- **Production** scope → production Neon branch connection string.
- **Preview** scope → a single persistent Neon `preview` branch (created off production, copy-on-write).
- **Development** scope → unset on Vercel; local dev uses the Docker override in `lib/db.js`.

Rationale: requires no code change, leverages Vercel's native per-environment variable scoping, and gives preview deployments their own schema sandbox. A shared branch (rather than per-PR branches) keeps connection-string management to a single value.

**Trade-off**: a destructive migration still mutates the shared preview branch for all concurrent previews, and the branch's data drifts from production over time. Mitigation documented: periodically "Reset from parent" in Neon to refresh prod-like data.

### Decision: Scope `TOKEN_ENCRYPTION_KEY` per environment too
Preview and Production should hold independent `TOKEN_ENCRYPTION_KEY` values so a preview cannot decrypt production tokens (and vice-versa). Documented alongside `DATABASE_URL`.

## Risks / Trade-offs

- **Misconfiguration risk**: if the Preview scope is left unset, Vercel may fall back to a Production-scoped value and re-introduce the leak. Mitigated by explicit documentation and a verification step (check the Preview deployment's `DATABASE_URL`/function logs point at the preview branch).
- **Data drift** on the shared preview branch (see trade-off above).

## Migration Plan

Documentation-only; no schema or code migration. Operational rollout: create the Neon `preview` branch, add the Preview-scoped `DATABASE_URL` (and `TOKEN_ENCRYPTION_KEY`) in Vercel, redeploy a preview, and confirm migrations ran against the preview branch.

## Open Questions

None.
