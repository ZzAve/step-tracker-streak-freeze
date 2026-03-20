## 1. Project Setup

- [x] 1.1 Initialize Vercel project with static HTML + serverless functions structure
- [x] 1.2 Set up Vercel Postgres and create database schema (users, daily_steps, streaks tables)
- [x] 1.3 Register Garmin Connect developer application and obtain OAuth consumer key/secret

## 2. Garmin OAuth Integration

- [x] 2.1 Implement `/api/auth/garmin` — initiate OAuth 1.0a flow (request token + redirect to Garmin)
- [x] 2.2 Implement `/api/auth/callback` — handle callback, exchange for access token, store in DB, set session cookie
- [x] 2.3 Implement session middleware — validate signed httpOnly cookie on authenticated routes
- [x] 2.4 Implement `/api/auth/logout` — clear session cookie

## 3. Step Data Sync

- [x] 3.1 Implement Garmin API client for fetching daily step summaries
- [x] 3.2 Implement historical data import on first login (fetch all available past data)
- [x] 3.3 Implement `/api/steps` — sync steps (if >1 hour since last sync), calculate streak, return dashboard data

## 4. Streak Engine

- [x] 4.1 Implement streak calculation logic (consecutive days with goal met or freeze applied)
- [x] 4.2 Implement freeze earning (every 5 goal-met days, max 2, counter reset after earn or use)
- [x] 4.3 Implement automatic freeze application on missed days
- [x] 4.4 Implement longest streak tracking

## 5. Dashboard Frontend

- [x] 5.1 Create HTML page with login/unauthenticated state and "Connect Garmin" button
- [x] 5.2 Build streak display (current streak, longest streak)
- [x] 5.3 Build freeze inventory display (count + progress toward next freeze)
- [x] 5.4 Build weekly step overview with day-by-day indicators (met/freeze/missed)
- [x] 5.5 Add week navigation (previous/next week)
- [x] 5.6 Add logout button and functionality

## 6. Deploy & Test

- [x] 6.1 Configure Vercel environment variables (Garmin OAuth keys, session secret)
- [x] 6.2 Deploy to Vercel and test full OAuth flow end-to-end
- [x] 6.3 Verify streak calculation with real Garmin data
