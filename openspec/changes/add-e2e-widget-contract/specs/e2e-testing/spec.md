## ADDED Requirements

### Requirement: Per-user API-key seeding

The end-to-end suite SHALL be able to provision an API key for a specific test user directly in the real database, so the widget endpoint can be exercised deterministically with a key whose plaintext the test already knows.

#### Scenario: Seeded API key authenticates the widget endpoint

- WHEN a test seeds an API key for a registered user
- THEN a request to the widget endpoint using that key's plaintext is authenticated as that user
- AND the response reflects that user's seeded step data

#### Scenario: Seeded API key can be expired on demand

- WHEN a test seeds an API key with an expiry in the past
- THEN a request to the widget endpoint using that key is rejected as expired

#### Scenario: Seeding is isolated per user

- WHEN multiple tests seed API keys in parallel, each for its own unique user
- THEN each key authenticates only its own user
- AND no test observes another test's key or data

### Requirement: Widget API contract coverage

The end-to-end suite SHALL cover the widget endpoint that the external device widget consumes, asserting both the real key-minting path and the full response contract derived from seeded data.

#### Scenario: A minted key authenticates the widget endpoint

- WHEN a registered user mints an API key through the real key-creation endpoint
- THEN that key authenticates a subsequent request to the widget endpoint
- AND the widget endpoint returns a successful response

#### Scenario: Widget response matches the published contract

- WHEN an authenticated request is made to the widget endpoint for a user with seeded step data
- THEN the response includes the current streak, longest streak, available freezes, next milestone and days remaining to it, today's steps, the step goal, a seven-entry week status row, and cache-control timestamps
- AND each field has the type and shape the device widget depends on

#### Scenario: Widget streak and freezes match seeded data

- WHEN the widget endpoint is requested for a user whose seeded step data forms a known run of consecutive goal-met days
- THEN the reported streak, milestone countdown, and freeze count are consistent with that run

#### Scenario: Widget today's steps and week tail reflect seeded data

- WHEN the widget endpoint is requested for a user with seeded step data for today
- THEN the reported today's steps match the seeded value
- AND the final entry of the week status row reflects whether today's seeded steps met the goal

#### Scenario: Widget rejects missing, invalid, and expired keys

- WHEN the widget endpoint is requested without a key, with an unknown key, or with an expired key
- THEN the request is rejected as unauthorized
- AND the response distinguishes the missing, invalid, and expired cases
