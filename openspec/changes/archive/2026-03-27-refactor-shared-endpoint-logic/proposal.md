## Why

The `api/steps.js` and `api/widget.js` endpoints duplicate significant logic: loading step data, formatting dates, calculating streaks, and building responses. This makes maintenance error-prone — changes to step fetching or streak calculation need to be applied in both places, and subtle inconsistencies have already emerged (e.g., different date formatting approaches, different sync error handling patterns). Extracting shared logic will reduce duplication and make both endpoints easier to evolve.

## What Changes

- Extract shared step-fetching and date-formatting logic into a reusable `lib/steps.js` module
- Extract shared streak-calculation-and-response-building into a helper that both endpoints call
- Simplify both endpoint files to focus only on their unique concerns: authentication method, sync error strategy, and response shaping
- Preserve all existing behavior — no breaking changes to API contracts

## Capabilities

### New Capabilities
- `shared-step-pipeline`: Shared module encapsulating step data fetching, date normalization, and streak calculation — the common pipeline used by both endpoints

### Modified Capabilities

## Impact

- **Code**: `api/steps.js`, `api/widget.js` (simplified), new `lib/steps.js` (shared logic)
- **Existing libs**: No changes to `lib/streak.js`, `lib/sync.js`, or `lib/db.js`
- **APIs**: No changes to request/response contracts for either endpoint
- **Tests**: New unit tests for `lib/steps.js`; existing endpoint behavior unchanged