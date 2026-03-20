## 1. Setup

- [x] 1.1 Install `node-pg-migrate` and `pg` as dependencies
- [x] 1.3 Create `migrations/` directory

## 2. Extract existing schema into migration files

- [x] 2.1 Create migration for `users` table (CREATE TABLE with all original columns)
- [x] 2.2 Create migration for `daily_steps` table
- [x] 2.3 Create migration for `streaks` table
- [x] 2.4 Create migration for `api_key` column addition on users
- [x] 2.5 Create migration for TIMESTAMP → TIMESTAMPTZ conversion on users and streaks

## 3. Rewrite initializeDatabase

- [x] 3.1 Replace inline DDL in `lib/db.js` with programmatic node-pg-migrate runner call
- [x] 3.2 Configure runner to use `DATABASE_URL` (with dev fallback) and `migrations/` directory
- [x] 3.3 Cache the initialization promise so migrations only run once per container lifecycle (cold start), not on every request

## 4. Verification

- [x] 4.1 Run migrations against a clean local database and verify schema matches current state
- [x] 4.2 Run migrations against a database with existing schema (idempotency check via tracking table)
