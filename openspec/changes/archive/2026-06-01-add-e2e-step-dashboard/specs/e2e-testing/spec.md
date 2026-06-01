## ADDED Requirements

### Requirement: Per-user step data seeding

The end-to-end suite SHALL be able to seed step data for a specific test user directly into the real database, so dashboard behavior can be exercised deterministically without depending on external step sources.

#### Scenario: Seeded step data is readable by the application

- WHEN a test seeds daily step records for a registered user
- THEN those records are written to the real database for that user
- AND a subsequent application read for that user returns the seeded step values

#### Scenario: Seeding is isolated per user

- WHEN multiple tests seed step data in parallel, each for its own unique user
- THEN each user's seeded data is independent
- AND no test observes step data seeded by another test

#### Scenario: No external step source is contacted

- WHEN a test seeds step data for a user that has no linked external step provider
- THEN the application serves the dashboard from the seeded data
- AND no external step-provider network call is made

### Requirement: Step dashboard flow coverage

The end-to-end suite SHALL cover the signed-in step dashboard, asserting that seeded step data is rendered to the user as today's steps, streak, weekly status, and available freezes.

#### Scenario: Dashboard shows today's seeded steps

- WHEN a signed-in user with seeded step data for today loads the dashboard
- THEN the dashboard displays today's step count matching the seeded value

#### Scenario: Dashboard shows the streak derived from seeded data

- WHEN a signed-in user has seeded step data forming a run of consecutive goal-met days
- THEN the dashboard displays a current streak consistent with that run

#### Scenario: Dashboard shows the weekly status row

- WHEN a signed-in user with seeded step data for the past several days loads the dashboard
- THEN the dashboard displays a seven-day status row
- AND each day reflects whether the seeded steps met the goal

#### Scenario: Dashboard shows available freezes

- WHEN a signed-in user loads the dashboard
- THEN the dashboard displays the number of available streak freezes derived from the seeded data
