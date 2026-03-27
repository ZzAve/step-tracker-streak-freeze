## Why

The Garmin widget currently uses a hardcoded 30-minute cache TTL on the device, with no awareness of when the backend actually has new data available. This means the widget either fetches unnecessarily (data hasn't changed) or shows stale data longer than needed. By adding server-controlled cache timestamps to the API response, the backend can signal exactly when fresh data will be available, eliminating guesswork on the widget side. A minimum refresh interval on the widget prevents excessive API calls regardless of server hints.

## What Changes

- Add `lastUpdatedAt` (ISO 8601 timestamp) to the widget API response, indicating when the data was last refreshed from Garmin
- Add `refreshAfter` (ISO 8601 timestamp) to the widget API response, indicating the earliest time new data may be available — effectively server-controlled cache duration
- Update the Garmin widget to use `refreshAfter` instead of the hardcoded 30-minute `CACHE_TTL_SECONDS` to determine staleness
- Add a minimum refresh interval of 7 minutes on the widget to prevent excessive fetching regardless of server hints
- Widget uses `lastUpdatedAt` to display data freshness to the user (e.g. distinguish between "just synced" and "showing data from hours ago")

## Capabilities

### New Capabilities
- `server-controlled-cache`: Backend cache metadata (`lastUpdatedAt`, `refreshAfter`) in the widget API response, with widget-side interpretation and minimum refresh floor

### Modified Capabilities
- `widget-offline-cache`: Cache staleness logic changes from hardcoded TTL to server-driven `refreshAfter` with a 7-minute minimum refresh interval
- `widget-api`: Response schema extends with `lastUpdatedAt` and `refreshAfter` fields

## Impact

- **API**: `GET /api/widget` response gains two new fields — additive, non-breaking for older widget versions that ignore unknown fields
- **Widget**: `StreakView.mc` cache logic changes — staleness check uses `refreshAfter` instead of `CACHE_TTL_SECONDS`; new 7-minute minimum refresh constant
- **Backend**: `api/widget.js` computes `lastUpdatedAt` from `users.last_synced_at` and `refreshAfter` from sync cooldown logic
- **Sync**: `lib/sync.js` sync cooldown (`SYNC_COOLDOWN_MS = 1 hour`) becomes the basis for `refreshAfter` calculation