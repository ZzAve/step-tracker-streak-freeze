## 1. Docker Compose Setup

- [x] 1.1 Create `docker-compose.yml` with Postgres 17 and local-neon-http-proxy
- [x] 1.2 Add `.env.example` with all environment variables documented

## 2. Database Connection

- [x] 2.1 Add `ws` npm dependency
- [x] 2.2 Update `lib/db.js` with environment-aware neonConfig (local proxy in development, Neon cloud in production)

## 3. Verification

- [x] 3.1 Verify `docker-compose up -d` starts both services and Postgres is reachable
- [x] 3.2 Verify `vercel dev` connects to local Postgres via the neon proxy
- [x] 3.3 Verify existing streak tests still pass
