# Step Tracker — Streak Freeze

A personal step-tracking app that syncs with Garmin and keeps you honest about your 10,000-steps-a-day habit. The twist: earn **streak freezes** by hitting your goal consistently — use them to skip days without breaking your streak.

## Features

- **Streak tracking** — daily 10,000-step goal, current streak + longest streak
- **Freeze mechanic** — earn 1 freeze every 35 consecutive goal days (max 2 held), each covers up to 5 missed days
- **Garmin sync** — pulls step history automatically via Garmin Connect API
- **Garmin widget** — glanceable watch widget with arc progress, weekly overview, and freeze indicators
- **API keys** — generate keys for external access (e.g. the watch widget)

## Tech Stack

- **Backend:** Node.js serverless functions on [Vercel](https://vercel.com)
- **Database:** PostgreSQL via [Neon](https://neon.tech) (serverless-friendly)
- **Auth:** Garmin OAuth
- **Watch widget:** MonkeyC (Garmin Connect IQ)
- **Frontend:** Vanilla HTML/CSS/JS

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for local Postgres + Neon proxy)
- A [Garmin Connect](https://connect.garmin.com) account and OAuth app credentials

### Local setup

```bash
# Install dependencies
npm install

# Start local database
docker-compose up -d

# Copy and fill in environment variables
cp .env.example .env.local
```

Required environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GARMIN_CONSUMER_KEY` | Garmin OAuth consumer key |
| `GARMIN_CONSUMER_SECRET` | Garmin OAuth consumer secret |
| `SESSION_SECRET` | Secret for signing session cookies |

```bash
# Start the dev server
vercel dev
```

Database migrations run automatically on startup.

### Running tests

```bash
npm test

# Single file
node --test lib/streak.test.js
```

## Garmin Widget

The widget lives in `garmin-widget/` and is built with the [Garmin Connect IQ SDK](https://developer.garmin.com/connect-iq/overview/).

**Supported devices:** Fenix 7, Forerunner 265/965, Venu 2/3, Vivoactive 4/5.

**Setup:**
1. Deploy the app and generate an API key at `/keys`
2. Sideload the widget via the Connect IQ SDK or Garmin Express
3. Set your `apiUrl` and `apiKey` in the Connect IQ companion app settings

The widget shows your current streak, freeze count, a circular arc for today's step progress (live from the watch sensor), and a 7-day status row. Tap to switch to a detail screen with your next milestone and longest streak.

## Deployment

Deploy to Vercel with one click or via the CLI:

```bash
vercel deploy
```

Point `DATABASE_URL` to a Neon database and set the remaining env vars in the Vercel dashboard.

### Environments

Migrations run automatically on cold start (`initializeDatabase()` in `lib/db.js`) against
whatever `DATABASE_URL` resolves to. `lib/db.js` uses `DATABASE_URL` verbatim except when
`NODE_ENV === 'development'`, which switches to the local Docker database. Vercel preview and
production deployments both run with `NODE_ENV=production`, so they use the injected
`DATABASE_URL` directly.

To keep preview deployments from migrating the **production** database, scope the
database-backing env vars **per Vercel environment** (Vercel lets the same key hold a different
value for Production / Preview / Development):

| Variable | Production scope | Preview scope | Development (local) |
| --- | --- | --- | --- |
| `DATABASE_URL` | Production Neon branch | Shared persistent Neon `preview` branch | Docker (`NODE_ENV=development` override) |
| `TOKEN_ENCRYPTION_KEY` | Production key | Separate preview key | Local key |

All preview deployments share the one `preview` branch, which is acceptable — they only need to
be isolated from production, not from each other.

**One-time setup:**

1. In the Neon console, create a persistent branch named `preview` off the production branch
   (copy-on-write, so it starts with prod's schema and data). Copy its pooled connection string.
2. In Vercel → Settings → Environment Variables, set the **Preview**-scoped value of
   `DATABASE_URL` to the `preview` branch string, and make the existing production string
   **Production-only**. Give `TOKEN_ENCRYPTION_KEY` a Preview-scoped value too. Leave Development
   unset (local dev uses the Docker override).
3. Redeploy a preview and confirm migrations ran against the `preview` branch — the production
   database is untouched.

A destructive migration still mutates the shared `preview` branch for all previews, and its data
drifts from production over time; use Neon's **Reset from parent** to refresh prod-like data.
