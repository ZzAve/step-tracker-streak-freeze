## ADDED Requirements

### Requirement: Backend includes lastUpdatedAt in widget API response
The widget API (`GET /api/widget`) SHALL include a `lastUpdatedAt` field (Number, epoch seconds) in the JSON response. This value SHALL equal the user's `last_synced_at` timestamp converted to epoch seconds. When `last_synced_at` is null, `lastUpdatedAt` SHALL be `0`.

#### Scenario: User has synced before
- **WHEN** a successful `/api/widget` request is made for a user whose `last_synced_at` is `2026-03-25T10:00:00Z`
- **THEN** the response includes `"lastUpdatedAt": 1774684800` (the epoch seconds equivalent)

#### Scenario: User has never synced
- **WHEN** a successful `/api/widget` request is made for a user whose `last_synced_at` is null
- **THEN** the response includes `"lastUpdatedAt": 0`

### Requirement: Backend includes refreshAfter in widget API response
The widget API (`GET /api/widget`) SHALL include a `refreshAfter` field (Number, epoch seconds) in the JSON response. This value SHALL equal `last_synced_at + SYNC_COOLDOWN_MS` converted to epoch seconds. When `last_synced_at` is null, `refreshAfter` SHALL equal the current server time in epoch seconds.

#### Scenario: User synced recently
- **WHEN** a successful `/api/widget` request is made for a user whose `last_synced_at` is `2026-03-25T10:00:00Z` and `SYNC_COOLDOWN_MS` is 3600000 (1 hour)
- **THEN** the response includes `"refreshAfter": 1774688400` (last_synced_at + 1 hour in epoch seconds)

#### Scenario: User has never synced
- **WHEN** a successful `/api/widget` request is made for a user whose `last_synced_at` is null and the current server time is `2026-03-25T12:00:00Z`
- **THEN** the response includes `"refreshAfter": 1774692000` (current server time in epoch seconds, signaling immediate refresh is allowed)

### Requirement: Widget uses refreshAfter for staleness determination
The widget SHALL use the `refreshAfter` value from the cached API response (stored alongside the cached data) instead of the hardcoded 30-minute TTL to determine whether the cache is stale. The cache SHALL be considered stale when `Time.now().value() >= refreshAfter`.

#### Scenario: Current time is before refreshAfter
- **WHEN** the widget opens and the stored `refreshAfter` is 1000 seconds in the future
- **THEN** the widget displays cached data and does NOT initiate an HTTP fetch

#### Scenario: Current time is at or after refreshAfter
- **WHEN** the widget opens and the stored `refreshAfter` is in the past or equal to the current time
- **THEN** the widget displays cached data and initiates a background HTTP fetch

#### Scenario: No refreshAfter in cached data (legacy cache)
- **WHEN** the widget opens and the cached data does not contain a `refreshAfter` field
- **THEN** the widget falls back to the existing behavior: treat cache as stale if older than 1800 seconds

### Requirement: Widget enforces minimum refresh interval of 7 minutes
The widget SHALL NOT initiate an HTTP fetch if less than 420 seconds (7 minutes) have elapsed since the last successful fetch, regardless of the `refreshAfter` value. The last fetch time is determined by the existing `cacheTimestamp` value.

#### Scenario: Widget opened within 7 minutes of last fetch
- **WHEN** the widget opens, `refreshAfter` is in the past, but `cacheTimestamp` is less than 420 seconds old
- **THEN** the widget displays cached data and does NOT initiate an HTTP fetch

#### Scenario: Widget opened after 7 minutes with stale refreshAfter
- **WHEN** the widget opens, `refreshAfter` is in the past, and `cacheTimestamp` is 420 or more seconds old
- **THEN** the widget displays cached data and initiates a background HTTP fetch

### Requirement: Widget stores refreshAfter from API response
The widget SHALL save the `refreshAfter` value from the API response to `Application.Storage` under the key `"refreshAfter"` after every successful HTTP response. This value is used on subsequent opens for staleness determination.

#### Scenario: Successful fetch stores refreshAfter
- **WHEN** the widget receives a successful HTTP 200 response containing `"refreshAfter": 1774688400`
- **THEN** the value `1774688400` is saved to `Application.Storage` under key `"refreshAfter"`

#### Scenario: Failed fetch preserves stored refreshAfter
- **WHEN** the widget receives a non-200 HTTP response or a network error
- **THEN** the existing `"refreshAfter"` value in `Application.Storage` is left unchanged