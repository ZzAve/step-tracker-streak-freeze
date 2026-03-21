## Why

The Garmin widget currently fetches fresh data from the API on every `onShow` call, meaning users see a loading state every time they open the widget. On-wrist data should be available instantly from persistent storage, with background refresh happening transparently when data is stale (>30 minutes old).

## What Changes

- Add persistent storage cache using `Application.Storage` to save the last successful API response and its timestamp
- On widget open, load and display cached data immediately (no loading delay when cache exists)
- Trigger a background refresh if the cached data is older than 30 minutes
- Show a subtle visual indicator (e.g., a small animated dot or label) while a background refresh is in progress
- Update the existing `connect-iq-widget` spec to reflect the new caching and refresh-indicator requirements

## Capabilities

### New Capabilities

- `widget-offline-cache`: Persistent storage of API response data on the watch using `Application.Storage`, with timestamp-based staleness detection (30-minute TTL) and background refresh on open

### Modified Capabilities

- `connect-iq-widget`: Widget load behavior changes — data is loaded from cache on open rather than always fetching; a refresh indicator is shown during background updates

## Impact

- `garmin-widget/source/StreakView.mc`: primary change — add cache read/write logic, staleness check, and refresh indicator rendering
- `garmin-widget/source/StreakApp.mc`: no changes expected
- `garmin-widget/source/StreakDelegate.mc`: no changes expected
- No backend or API changes required
- Requires Connect IQ SDK with `Application.Storage` support (available in CIQ 3.1.0+, already targeted)
