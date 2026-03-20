## Why

Pino logs are outputting JSON to stdout but Vercel's log viewer shows them as opaque strings — not filterable by level, route, or custom fields. This makes debugging production issues slow and painful. Vercel now supports native structured log filtering with filter pills for level, status, and custom JSON fields. We just need to make sure our Pino output is structured in a way Vercel can parse.

## What Changes

- Configure Pino to output structured JSON that Vercel can parse and index for field-level filtering
- Add consistent structured context (route, method, duration, user context) across all API route logs
- Add request-level correlation IDs for tracing requests across log entries

## Capabilities

### New Capabilities
- `structured-logging`: Pino configuration, log context standards, and correlation IDs for filterable production logs in Vercel's native UI

### Modified Capabilities
<!-- No existing spec-level requirements are changing -->

## Impact

- **Code**: `lib/logger.js` (Pino config), new `lib/request-logger.js`, all 6 API routes (structured context enrichment)
- **Dependencies**: None new — uses Pino's existing JSON output and Node.js built-in `crypto.randomUUID()`
