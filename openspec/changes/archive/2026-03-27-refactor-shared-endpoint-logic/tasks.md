## 1. Create shared module

- [x] 1.1 Create `lib/steps.js` with `formatDateStr(dateValue)` helper that normalizes Date objects and strings to `YYYY-MM-DD`
- [x] 1.2 Add `fetchStepsAndStreak(userId)` function that queries `daily_steps`, normalizes dates via `formatDateStr`, and returns `{ allSteps, streak }`
- [x] 1.3 Write unit tests for `formatDateStr` (Date input, string input, edge cases)
- [x] 1.4 Write unit tests for `fetchStepsAndStreak` (user with data, user with no data)

## 2. Integrate into endpoints

- [x] 2.1 Refactor `api/widget.js` to import and use `fetchStepsAndStreak()` instead of inline step-fetching/date-formatting/streak-calculation
- [x] 2.2 Refactor `api/steps.js` to import and use `fetchStepsAndStreak()` instead of inline step-fetching/date-formatting/streak-calculation
- [x] 2.3 Verify both endpoints produce identical responses before and after refactor