# Known Issues

## Code cleanup

### Commented-out debug line in `api/steps.js`
- **Location**: `api/steps.js:78`
- **Description**: `// console.log("Row", row)` — leftover debug statement from development. Should be removed or replaced with a `logger.debug()` call if the output is still wanted.

## Spec hygiene

### Kampvuur UI redesign spec acceptance criteria not updated
- **Location**: `openspec/changes/kampvuur-ui-redesign/specs/*.md`
- **Description**: The spec acceptance criteria still contain unchecked checkboxes, even though all tasks in `tasks.md` are marked complete. The specs were written before implementation and not updated afterward. Consider updating or archiving the change.

### Widget API `today_steps` field undocumented
- **Location**: `openspec/changes/garmin-widget/specs/widget-api/spec.md`
- **Description**: The `/api/widget` response includes a `today_steps` field (the user's step count for today, or `null`). This field is not listed in the spec's response schema. The spec lists `{ streak, longest, freezes, next_milestone, days_to_milestone }` but the implementation also returns `today_steps`.