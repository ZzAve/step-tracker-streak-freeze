## Context

The app currently uses Garmin's official OAuth 1.0a API, which requires developer program approval and consumer key/secret. This approval process is slow and blocks development. The `garmin-connect` npm package (v1.6.2) provides an alternative: it authenticates using regular Garmin SSO credentials (username/password) and exposes methods to fetch fitness data. The trade-off is that users must enter their Garmin credentials directly into our app.

Current auth flow: OAuth redirect to Garmin -> callback -> store access tokens -> session cookie.
New auth flow: Login form -> POST credentials to our API -> server authenticates via garmin-connect -> store session tokens -> session cookie.

## Goals / Non-Goals

**Goals:**
- Remove dependency on Garmin developer program approval
- Allow immediate authentication using Garmin SSO credentials
- Maintain existing session management (signed httpOnly cookies)
- Continue fetching daily step data for streak calculation
- Display clear security disclaimer on login form

**Non-Goals:**
- Multi-user production deployment (this is a personal-use app)
- Encrypting stored Garmin credentials at rest (tokens are session-based, not passwords)
- Supporting Garmin China domain (`garmin.cn`)
- Caching garmin-connect client instances across serverless invocations

## Decisions

### 1. Use `garmin-connect` package for server-side authentication
**Choice**: Authenticate via `garmin-connect`'s `GarminConnect.login(email, password)` on the server.
**Alternative**: Continue pursuing official Garmin developer API keys.
**Rationale**: Official keys require manual approval with unpredictable timelines. For a personal project, garmin-connect provides immediate access with acceptable trade-offs.

### 2. Store garmin-connect tokens in database, not credentials
**Choice**: After successful login, export the garmin-connect OAuth1+OAuth2 tokens via `client.exportToken()` and store them as JSON in a `garmin_tokens` column. On subsequent requests, restore the session with `client.loadToken()` instead of re-authenticating with credentials.
**Alternative**: Store the user's email/password and re-login each time.
**Rationale**: Token reuse avoids storing plaintext passwords and reduces login frequency. Tokens expire naturally and can be refreshed by the library.

### 3. Per-day step fetching with `getSteps(date)`
**Choice**: The garmin-connect package only exposes `getSteps(date)` which returns a single number per day. We'll iterate over the date range needed.
**Alternative**: Use internal/undocumented garmin-connect endpoints for bulk fetching.
**Rationale**: Using the public API of the package is more stable. For daily syncs the iteration is only 1-2 days. Historical import (up to 365 days) is a one-time cost.

### 4. Login form with security disclaimer
**Choice**: Replace the "Connect with Garmin" OAuth button with a login form (email + password fields) preceded by a visible security disclaimer.
**Rationale**: Users must understand they're entering Garmin credentials into a third-party app, not Garmin's own site.

### 5. Database migration approach
**Choice**: Drop `oauth_token` and `oauth_token_secret` columns, add `garmin_tokens` JSONB column. Since there are no production users yet, no data migration is needed — just recreate the schema.
**Alternative**: Add columns alongside existing ones.
**Rationale**: No existing users to migrate. Clean schema is simpler.

## Risks / Trade-offs

- **[Unofficial API]** garmin-connect relies on Garmin's internal web authentication flow, which could break if Garmin changes their login process. → Mitigation: Pin package version, monitor for updates.
- **[Token expiry]** Stored tokens may expire, requiring users to re-login. → Mitigation: garmin-connect handles OAuth2 token refresh automatically. If refresh fails, return 401 so frontend prompts re-login.
- **[Security perception]** Users entering credentials on a third-party site is inherently risky. → Mitigation: Clear disclaimer on login form. App is for personal use with trusted users.
- **[Per-day fetching performance]** Historical import iterates up to 365 individual API calls. → Mitigation: One-time cost on first login. Subsequent syncs only fetch 1-2 days. Could parallelize with `Promise.all` in batches if needed.
