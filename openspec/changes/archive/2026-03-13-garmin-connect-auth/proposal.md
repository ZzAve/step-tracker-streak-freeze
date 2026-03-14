## Why

The Garmin Connect Developer Program requires a lengthy manual approval process to obtain OAuth consumer keys, blocking development and deployment. By switching to the `garmin-connect` npm package, which authenticates using standard Garmin SSO credentials (username/password), we can eliminate the dependency on official API keys entirely. This is a personal-use app where users knowingly provide their own Garmin credentials.

## What Changes

- **BREAKING**: Remove Garmin OAuth 1.0a flow (`/api/auth/garmin`, `/api/auth/callback`) and replace with a username/password login form that authenticates server-side via `garmin-connect`
- Replace `oauth-1.0a` dependency with `garmin-connect` npm package
- Replace `lib/oauth.js` and rewrite `lib/garmin.js` to use `garmin-connect` client for fetching steps
- Update database schema: replace `oauth_token`/`oauth_token_secret` columns with `garmin_tokens` JSON column for storing garmin-connect session tokens
- Add a login form to the frontend with a security disclaimer warning users their credentials are sent to this server
- New `/api/auth/login` POST endpoint accepting `{ email, password }` and authenticating via garmin-connect server-side
- Remove `api/auth/garmin.js` and `api/auth/callback.js`
- No longer need `GARMIN_CONSUMER_KEY` or `GARMIN_CONSUMER_SECRET` env vars

## Capabilities

### New Capabilities
- `credential-auth`: Username/password authentication flow using garmin-connect package, including login form with security disclaimer, server-side Garmin SSO authentication, and token persistence

### Modified Capabilities
- `garmin-oauth`: **BREAKING** — Replaced entirely by credential-based auth. OAuth 1.0a flow removed.
- `data-sync`: Step fetching changes from official Garmin Wellness API to garmin-connect package's `getSteps()` method, requiring per-day iteration instead of date-range queries

## Impact

- **API endpoints**: `/api/auth/garmin` and `/api/auth/callback` removed; `/api/auth/login` added
- **Dependencies**: `oauth-1.0a` removed, `garmin-connect` added
- **Database**: `users` table schema changes (token columns)
- **Environment variables**: `GARMIN_CONSUMER_KEY` and `GARMIN_CONSUMER_SECRET` no longer needed
- **Frontend**: Login screen changes from OAuth redirect button to credential form
- **Security**: Users must trust this app with their Garmin credentials — disclaimer required
