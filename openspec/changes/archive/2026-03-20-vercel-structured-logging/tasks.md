## 1. Request Logger Utility

- [x] 1.1 Create `lib/request-logger.js` with `createRequestLogger(req)` that returns a Pino child logger with `route`, `method`, `correlationId` fields
- [x] 1.2 Use `x-vercel-id` header for correlationId when available, fall back to `crypto.randomUUID()`
- [x] 1.3 Add request duration tracking: capture start time and provide a `logResponse(res)` helper that logs `durationMs` and `statusCode`

## 2. Migrate API Routes

- [x] 2.1 Update `api/auth/login.js` to use `createRequestLogger(req)` instead of bare `logger`
- [x] 2.2 Update `api/auth/logout.js` to use `createRequestLogger(req)`
- [x] 2.3 Update `api/apikey.js` to use `createRequestLogger(req)`
- [x] 2.4 Update `api/apikey/[id].js` to use `createRequestLogger(req)`
- [x] 2.5 Update `api/steps.js` to use `createRequestLogger(req)`
- [x] 2.6 Update `api/widget.js` to use `createRequestLogger(req)`

## 3. Verify Structured Output

- [x] 3.1 Run the app locally and verify log output is single-line JSON with `route`, `method`, `correlationId`, `durationMs`, `statusCode` fields
- [x] 3.2 Deploy to Vercel and confirm logs appear as structured/filterable in the Vercel log viewer
