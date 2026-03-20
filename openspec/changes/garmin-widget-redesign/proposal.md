## Why

The current Garmin widget uses a custom layout (fire icon, horizontal progress bar, freeze shields) that feels disconnected from native Garmin widgets. Native widgets (steps, floors, intensity minutes, calories) follow a consistent pattern: icon at top, circular arc progress, large centered metric, weekly indicators. Aligning with this pattern makes the widget feel native, reduces cognitive load, and adds a second detail screen for milestone info.

## What Changes

- Replace the horizontal milestone progress bar with a circular arc showing today's steps toward the step goal
- Replace the fire icon with a shoe bitmap icon (walking streak identity)
- Redesign the main layout: icon → arc → hero streak number → freeze indicators → weekly row
- Add a weekly status row showing past 6 days + today with hit/freeze/not_met/pending states
- Add a second screen (press to navigate) showing milestone progress and longest streak
- Use ActivityMonitor for real-time step data on the arc and today's weekly column
- Add `step_goal` and `week` (7-day history with per-day status) fields to the `/api/widget` response
- Remove the horizontal milestone progress bar and step count from the main screen

## Capabilities

### New Capabilities

_None — this change modifies existing capabilities._

### Modified Capabilities

- `connect-iq-widget`: Full UI redesign — new layout with arc, shoe icon, weekly row, freeze indicators, and second detail screen with milestone/longest streak info
- `widget-api`: Add `step_goal` and `week` array (per-day hit/freeze/not_met/pending status) to the response

## Impact

- **Widget source**: `garmin-widget/source/StreakView.mc` (full rewrite of `onUpdate`), `StreakDelegate.mc` (add screen navigation)
- **Widget resources**: New shoe bitmap icon, updated drawables
- **API**: `api/widget.js` — add `step_goal` and `week` to response
- **Streak calculation**: `lib/streak.js` — expose per-day annotations (already computed internally but discarded)
- **No breaking changes**: Existing API fields remain unchanged; new fields are additive
