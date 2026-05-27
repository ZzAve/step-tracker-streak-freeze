# CLAUDE.md

Changes and intent are tracked with openspec. No changes may occur without a spec for it.

## Commands

```bash
npm test          # Run all tests (Node.js built-in test runner)
vercel dev        # Run locally with Vercel dev server
```

To run a single test file:
```bash
node --test lib/streak.test.js
node --test api/steps.test.js
```

Local dev requires Docker for Postgres + Neon proxy:
```bash
docker-compose up
```

## Architecture

Three-tier step-tracking app with a streak freeze mechanic.

**Tiers:**
- `api/` — Vercel serverless functions (HTTP endpoints)
- `lib/` — Core business logic (streak calc, Garmin sync, DB access)
- `public/` — Vanilla JS/HTML frontend dashboard
- `garmin-widget/` — MonkeyC app for Garmin Connect IQ devices

**Data flow:**
1. User authenticates via Garmin OAuth (`api/auth/login.js`)
2. Step data syncs from Garmin API on request, with a 1-hour cooldown (`lib/sync.js`)
3. Streak state is calculated idempotently from `daily_steps` records (`lib/streak.js`)
4. Frontend or Garmin widget fetches via `GET /api/steps` or `GET /api/widget`

**Streak freeze mechanic** (`lib/streak.js`):
- Goal: 10,000 steps/day
- Earn 1 freeze per 35 consecutive goal days; max 2 held at once
- Each freeze covers up to 5 consecutive missed days without breaking the streak
- Streak is recalculated from scratch on each fetch (no stored state machine)

**Database** (Postgres via Neon in prod, Docker locally):
- `users` — Garmin tokens, sync timestamps
- `daily_steps` — Per-day step counts and goal status
- `streaks` — Calculated streak records
- `api_keys` — External API access tokens
- Migrations in `migrations/` run automatically on cold start via `node-pg-migrate`

**Deployment:** Vercel Functions; production DB is Neon serverless Postgres.

## Garmin Widget

Located in `garmin-widget/`, written in MonkeyC (Garmin Connect IQ SDK). Built with `monkey.jungle` config using the Garmin Connect IQ SDK toolchain — no npm involvement.

**Supported devices** (manifest.xml): Fenix 7, FR265/965, Venu 2/3, Vivoactive 4/5.

**Configuration:** User sets `apiKey` and `apiUrl` via the Connect IQ companion app settings (not hardcoded). Without these, the widget shows a "Stel API key in" prompt.

**API:** Calls `GET {apiUrl}/api/widget?key={apiKey}` — a dedicated endpoint returning streak, freezes, weekly status, today's steps, and a server-driven `refreshAfter` timestamp.

**Caching strategy** (`StreakView.mc`):
- Data persisted to device `Storage` between sessions
- Minimum refresh interval: 7 minutes (hard floor)
- Staleness driven by server's `refreshAfter` field; falls back to 30-minute TTL if absent
- Live today's steps read from `ActivityMonitor` directly (real-time arc progress without an API call)

**Two screens** (tap to toggle via `StreakDelegate`):
1. Main: circular arc for today's step progress, hero streak number, freeze snowflake icons, 7-day weekly status row
2. Detail: next milestone countdown + longest streak record
