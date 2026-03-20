## ADDED Requirements

### Requirement: Request logger with structured context
The system SHALL provide a `createRequestLogger(req)` utility in `lib/request-logger.js` that returns a Pino child logger with bound request context fields: `route`, `method`, `correlationId`, and `userId` (when available).

#### Scenario: Creating a request logger for an API call
- **WHEN** an API route handler calls `createRequestLogger(req)`
- **THEN** the returned logger SHALL include `route` (req.url), `method` (req.method), and `correlationId` fields in every log entry

#### Scenario: Correlation ID from Vercel header
- **WHEN** the incoming request includes an `x-vercel-id` header
- **THEN** the `correlationId` field SHALL use the value of `x-vercel-id`

#### Scenario: Correlation ID fallback
- **WHEN** the incoming request does not include an `x-vercel-id` header
- **THEN** the `correlationId` field SHALL be a UUID generated via `crypto.randomUUID()`

### Requirement: All API routes use request logger
Every API route handler SHALL use the request logger instead of the bare `logger` import for all log calls within request handling.

#### Scenario: API route logs include structured context
- **WHEN** any API route (`auth/login`, `auth/logout`, `apikey`, `apikey/[id]`, `steps`, `widget`) emits a log entry
- **THEN** the log entry SHALL contain `route`, `method`, and `correlationId` fields

### Requirement: Request duration logging
The system SHALL log the total request duration in milliseconds for every API request.

#### Scenario: Request completes successfully
- **WHEN** an API route handler finishes processing a request
- **THEN** a log entry SHALL be emitted with `durationMs` field indicating elapsed time and `statusCode` field indicating the response status

### Requirement: Pino outputs Vercel-parseable structured JSON
The Pino logger SHALL output JSON to stdout that Vercel can automatically parse and index for field-level filtering.

#### Scenario: Log output is valid structured JSON
- **WHEN** a log entry is emitted in production
- **THEN** the output SHALL be a single-line JSON object parseable by Vercel's log ingestion

