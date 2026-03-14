## ADDED Requirements

### Requirement: Docker Compose local environment
The system SHALL provide a Docker Compose configuration that runs Postgres 17 and a local Neon HTTP proxy.

#### Scenario: Start local environment
- **WHEN** developer runs `docker-compose up -d`
- **THEN** Postgres is available on port 5432 and Neon HTTP proxy on port 4444

#### Scenario: Postgres health check
- **WHEN** Docker Compose starts
- **THEN** the neon-proxy service waits for Postgres to be healthy before starting

### Requirement: Environment-aware database connection
The system SHALL configure @neondatabase/serverless to use the local proxy when `NODE_ENV=development`, and Neon cloud when in production.

#### Scenario: Local development connection
- **WHEN** `NODE_ENV` is `development`
- **THEN** neonConfig points fetchEndpoint to `http://db.localtest.me:4444/sql` and disables secure WebSocket

#### Scenario: Production connection
- **WHEN** `NODE_ENV` is not `development`
- **THEN** neonConfig uses default Neon cloud settings with `DATABASE_URL`

#### Scenario: API routes unchanged
- **WHEN** any API route uses `sql` tagged template from `lib/db.js`
- **THEN** queries work identically in both local and production environments

### Requirement: Environment variable documentation
The system SHALL provide a `.env.example` file documenting all required environment variables.

#### Scenario: Developer sets up project
- **WHEN** developer clones the repository
- **THEN** `.env.example` lists all required variables with descriptions and example values
