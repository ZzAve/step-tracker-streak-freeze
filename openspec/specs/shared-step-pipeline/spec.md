# shared-step-pipeline Specification

## Purpose
TBD - created by archiving change refactor-shared-endpoint-logic. Update Purpose after archive.
## Requirements
### Requirement: Shared step data fetching
The `lib/steps.js` module SHALL export a `fetchStepsAndStreak(userId)` function that queries all `daily_steps` rows for the given user, ordered by date ascending, normalizes each row's date to a `YYYY-MM-DD` string, and returns the step array along with the computed streak result from `calculateStreak()`.

#### Scenario: Fetch steps for a user with data
- **WHEN** `fetchStepsAndStreak(userId)` is called for a user with daily_steps records
- **THEN** it SHALL return `{ allSteps, streak }` where `allSteps` is an array of `{ date, steps, goal_met }` objects sorted by date ascending, and `streak` is the result of `calculateStreak(allSteps, null)`

#### Scenario: Fetch steps for a user with no data
- **WHEN** `fetchStepsAndStreak(userId)` is called for a user with no daily_steps records
- **THEN** it SHALL return `{ allSteps: [], streak }` where `streak` is the result of `calculateStreak([], null)`

### Requirement: Date normalization
The module SHALL export a `formatDateStr(dateValue)` helper that converts a `Date` object or date string to a `YYYY-MM-DD` string.

#### Scenario: Date object input
- **WHEN** `formatDateStr` receives a JavaScript `Date` object
- **THEN** it SHALL return a string in `YYYY-MM-DD` format with zero-padded month and day

#### Scenario: String input
- **WHEN** `formatDateStr` receives a string (e.g., ISO 8601 timestamp)
- **THEN** it SHALL return the first 10 characters (the `YYYY-MM-DD` portion)

### Requirement: Endpoint integration
Both `api/steps.js` and `api/widget.js` SHALL use `fetchStepsAndStreak()` from `lib/steps.js` instead of duplicating step-fetching, date-formatting, and streak-calculation logic inline.

#### Scenario: Widget endpoint uses shared pipeline
- **WHEN** the widget endpoint handles a valid request
- **THEN** it SHALL call `fetchStepsAndStreak(userId)` and use the returned data to build its response, producing the same JSON response shape as before

#### Scenario: Steps endpoint uses shared pipeline
- **WHEN** the steps endpoint handles a valid request
- **THEN** it SHALL call `fetchStepsAndStreak(userId)` and use the returned data to build its response, producing the same JSON response shape as before

