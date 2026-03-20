## Context

The app uses `@neondatabase/serverless` to connect to a Neon Postgres database. Schema setup lives in `lib/db.js` in a single `initializeDatabase()` function that runs `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE` statements on every cold start. There is no migration tracking — all statements run unconditionally.

## Goals / Non-Goals

**Goals:**
- Versioned, tracked migrations that each run exactly once
- Migrations only run once per cold start, not on every request
- Compatibility with Neon serverless Postgres (standard `DATABASE_URL`)
- Minimal dependency footprint

**Non-Goals:**
- ORM adoption — raw SQL via `@neondatabase/serverless` remains the query layer
- Auto-generated migrations from schema definitions
- Multi-environment migration orchestration (CI/CD pipelines)

## Decisions

### Use node-pg-migrate over alternatives
**Choice**: `node-pg-migrate` for migration management.
**Rationale**: SQL-first approach matches the existing raw-SQL codebase. Lightweight with no ORM coupling. Alternatives considered:
- *Knex migrations*: Brings a full query builder we don't need
- *Drizzle Kit*: Would require adopting Drizzle ORM schema definitions
- *Prisma Migrate*: Heavy ORM, overkill for this project

### Use SQL migration files (not JS)
**Choice**: Write migrations as `.sql` files rather than JS exports.
**Rationale**: The existing DDL is already SQL. SQL files are simpler, more portable, and easier to review. node-pg-migrate supports both; SQL keeps things consistent.

### Run migrations programmatically on cold start only
**Choice**: Call the node-pg-migrate runner from `initializeDatabase()` with a cached promise so it only executes once per container lifecycle.
**Rationale**: Vercel serverless functions have no startup hook — every handler calls `initializeDatabase()` on each request. By caching the initialization promise at module level, migrations only run on cold start (first invocation). Subsequent requests in the same container reuse the resolved promise with zero overhead. The current code has the same problem — it runs all DDL on every request.

### Migration file naming
**Choice**: Use sequential numeric prefixes (e.g., `001_create-users.sql`, `002_create-daily-steps.sql`).
**Rationale**: Sequential numbers are easier to read and reason about ordering at a glance. This is a single-developer project, so merge conflicts on sequence numbers are not a concern. Configured via node-pg-migrate's `--migration-filename-format` option.

## Risks / Trade-offs

- **[Startup latency]** → Migrations check runs on every cold start, but node-pg-migrate only queries the tracking table to determine what's pending — negligible overhead when nothing is pending.
- **[Neon compatibility]** → node-pg-migrate uses `pg` (node-postgres) directly, which is compatible with Neon's connection string. The app will need `pg` as a dependency alongside `@neondatabase/serverless` (which is used for queries). Migration runner uses standard Postgres protocol, not Neon's HTTP/WebSocket layer.
- **[Dual connection libraries]** → `pg` for migrations, `@neondatabase/serverless` for queries. This is acceptable since migrations only run at startup and the libraries connect to the same database.