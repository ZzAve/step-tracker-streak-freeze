## Context

Both `api/steps.js` and `api/widget.js` follow the same core pipeline: authenticate user, sync Garmin data, fetch `daily_steps` rows, format dates, calculate streak via `calculateStreak()`, then shape a response. The duplication lives in the middle of each handler — the step-fetching, date normalization, and streak calculation are copy-pasted with minor variations.

Currently the shared libraries (`lib/sync.js`, `lib/streak.js`, `lib/db.js`) handle individual concerns, but there's no module that composes them into the "fetch steps and compute streak" pipeline that both endpoints need.

## Goals / Non-Goals

**Goals:**
- Extract the duplicated step-fetch + date-format + streak-calculate pipeline into `lib/steps.js`
- Both endpoints call the shared pipeline and only differ in auth, sync strategy, and response shaping
- Zero changes to API response contracts
- Unit-testable shared module

**Non-Goals:**
- Changing the sync logic or streak algorithm
- Unifying the two endpoints into one
- Changing authentication mechanisms
- Refactoring the response shapes (each endpoint keeps its own format)

## Decisions

### 1. New `lib/steps.js` module with `fetchStepsAndStreak(userId)` function

Extract a single function that:
1. Queries `daily_steps` for the user
2. Normalizes dates to `YYYY-MM-DD` strings
3. Calls `calculateStreak()`
4. Returns `{ allSteps, streak }`

**Why**: This is the exact duplicated code block in both endpoints. A single function eliminates the duplication while keeping each endpoint in control of auth, sync behavior, and response formatting.

**Alternative considered**: A higher-level "endpoint factory" that generates handlers with config options for auth type, sync mode, etc. Rejected — too abstract for two endpoints, and the unique logic in each (milestones, week array, streak upsert) doesn't fit a config-driven pattern cleanly.

### 2. Keep sync calls in the endpoint handlers, not in the shared module

**Why**: The two endpoints have fundamentally different sync strategies (fatal vs non-fatal). Moving sync into the shared module would require passing error-handling config, making the abstraction leaky. Each endpoint should call `syncIfNeeded()` directly with its own options before calling the shared pipeline.

### 3. Date formatting as a standalone helper in `lib/steps.js`

Extract the date normalization logic (`Date → YYYY-MM-DD` string) as a named helper (`formatDateStr`) since both endpoints have identical but verbose inline implementations.

**Why**: The date formatting logic is 3 lines of manual string building that's easy to get wrong. A named function is clearer and DRY.

## Risks / Trade-offs

- **[Behavioral divergence risk]** If the two endpoints' step-fetching logic has already drifted in subtle ways, unifying could change behavior. → Mitigation: Verify both endpoints produce identical step arrays before and after refactor via tests.
- **[Over-abstraction risk]** Shared module could attract unrelated logic over time. → Mitigation: Keep the module focused — only step fetching, date formatting, and streak calculation. No auth, sync, or response shaping.