## 1. Dependencies & Cleanup

- [x] 1.1 Remove `oauth-1.0a` from package.json, keep `garmin-connect`
- [x] 1.2 Delete `lib/oauth.js`
- [x] 1.3 Delete `api/auth/garmin.js` and `api/auth/callback.js`

## 2. Database Schema

- [x] 2.1 Update `lib/db.js` — replace `oauth_token` and `oauth_token_secret` columns with `garmin_tokens JSONB` in users table

## 3. Authentication

- [x] 3.1 Create `api/auth/login.js` — POST endpoint accepting `{ email, password }`, authenticating via garmin-connect, storing tokens, and setting session cookie
- [x] 3.2 Rewrite `lib/garmin.js` — create garmin-connect client, load tokens, fetch steps per day with `getSteps(date)`

## 4. Step Sync

- [x] 4.1 Update `api/steps.js` — use new `lib/garmin.js` for fetching steps (iterate per day), handle token failure as 401

## 5. Frontend

- [x] 5.1 Update login screen in `public/index.html` — replace OAuth link with email/password form and security disclaimer
- [x] 5.2 Update login form JavaScript — POST credentials to `/api/auth/login`, handle success/error responses
