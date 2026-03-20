## Context

The app runs serverless API routes on Vercel, using Pino (`^10.3.1`) configured in `lib/logger.js` with default JSON output. All 6 API routes (`auth/login`, `auth/logout`, `apikey`, `apikey/[id]`, `steps`, `widget`) import this logger. Currently, Pino outputs valid JSON to stdout but Vercel displays it as raw strings — not filterable by field.

Vercel now supports native structured log filtering with visual filter pills for any JSON field (level, status, custom fields). We need to ensure our Pino output format aligns with what Vercel expects to enable this filtering.

## Goals / Non-Goals

**Goals:**
- Make all API route logs filterable by level, route, method, and status in Vercel's native log viewer
- Add correlation IDs to trace a single request across multiple log entries
- Enrich logs with consistent structured context (route, method, duration, userId)
- Zero new dependencies

**Non-Goals:**
- External log drain services (Axiom, Logflare, Better Stack) — can be added later if needed
- Client-side logging or error tracking
- Custom dashboards or alerting
- Changing log levels or adding new log statements beyond structural enrichment

## Decisions

### 1. No external log drain — Vercel native only

**Choice**: Use Vercel's built-in structured log filtering instead of integrating Axiom/Logflare.

**Rationale**:
- Vercel natively parses JSON from stdout and indexes fields for filtering
- No additional dependency, cost, or configuration needed
- Sufficient for this app's scale and debugging needs
- External drain can always be added later as a follow-up

### 2. Structured context via Pino child loggers

**Choice**: Create request-scoped child loggers with bound context rather than passing context to every log call.

**Rationale**:
- Pino's `logger.child({ route, method, correlationId })` binds fields once per request
- Every subsequent `child.info(...)` / `child.error(...)` automatically includes context
- Minimal changes to existing log call sites — just swap `logger` for `reqLogger`
- Zero performance overhead (Pino child loggers are lightweight)

### 3. Correlation IDs via Vercel request ID with fallback

**Choice**: Use `x-vercel-id` header when available, fall back to `crypto.randomUUID()`.

**Rationale**:
- `x-vercel-id` is Vercel's own request ID — using it aligns with Vercel's tracing
- `crypto.randomUUID()` available in Node 18+ (our minimum version), no dependency needed

### 4. Request logger as a shared utility

**Choice**: Create a `lib/request-logger.js` utility that each route calls at the top.

**Rationale**:
- All 6 API routes need the same enrichment pattern
- Single place to define what context fields are included
- Each route calls `createRequestLogger(req)` and uses the returned child logger

## Risks / Trade-offs

- **[Vercel log retention]** → Hobby plan: 1 hour, Pro: 3 days. If longer retention is needed, add a log drain later.
- **[Migration effort]** → All 6 API routes need updating. Changes are mechanical (swap logger for request logger). Low risk.
- **[Log line size]** → Adding context fields increases log line size slightly. Negligible at current scale.