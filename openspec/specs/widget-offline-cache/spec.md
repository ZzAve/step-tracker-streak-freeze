## Requirements

### Requirement: Widget caches API response to persistent storage
The widget SHALL save the full API response dictionary and a timestamp to `Application.Storage` after every successful HTTP response. The cache key for data SHALL be `"cachedData"` and for the timestamp `"cacheTimestamp"` (Unix epoch seconds via `Time.now().value()`).

#### Scenario: Successful fetch writes to cache
- **WHEN** the widget receives a successful HTTP 200 response from `/api/widget`
- **THEN** the full response dictionary is saved to `Application.Storage` under key `"cachedData"` and the current epoch timestamp is saved under key `"cacheTimestamp"`

#### Scenario: Failed fetch does not overwrite cache
- **WHEN** the widget receives a non-200 HTTP response or a network error
- **THEN** the existing cache in `Application.Storage` is left unchanged

### Requirement: Widget loads cached data on open
The widget SHALL read from `Application.Storage` in `onShow` before initiating any HTTP request. If cached data exists, it SHALL be applied to the view fields immediately and `WatchUi.requestUpdate()` SHALL be called.

#### Scenario: Cache exists on open
- **WHEN** the user opens the widget and `Application.Storage` contains `"cachedData"`
- **THEN** the widget displays the cached data immediately without waiting for an HTTP response

#### Scenario: No cache on first open
- **WHEN** the user opens the widget and `Application.Storage` has no `"cachedData"` entry
- **THEN** the widget shows the loading state ("Laden...") and initiates an HTTP fetch as before

### Requirement: Widget refreshes stale cache in the background
The widget SHALL compare the cached timestamp to the current time. If the cache is older than 1800 seconds (30 minutes), the widget SHALL initiate an HTTP fetch in the background while displaying the cached data.

#### Scenario: Cache is fresh (< 30 minutes old)
- **WHEN** the user opens the widget and `cacheTimestamp` is within 1800 seconds of the current time
- **THEN** the widget displays cached data and does NOT initiate an HTTP fetch

#### Scenario: Cache is stale (≥ 30 minutes old)
- **WHEN** the user opens the widget and `cacheTimestamp` is 1800 or more seconds older than the current time
- **THEN** the widget displays the cached data immediately AND initiates a background HTTP fetch

#### Scenario: Cache is absent (treated as infinitely stale)
- **WHEN** there is no `"cacheTimestamp"` in `Application.Storage`
- **THEN** the widget treats the cache as stale and initiates an HTTP fetch

### Requirement: Widget shows a refresh indicator during background fetch
While a background HTTP fetch is in progress AND cached data is already displayed, the widget SHALL render a small filled circle (4px radius, `COLOR_LT_GRAY`) near the top of the main screen. The indicator SHALL disappear when the fetch completes (success or failure).

#### Scenario: Background refresh in progress with cached data shown
- **WHEN** `isLoading` is true AND `streak` is not null (cached data is displayed)
- **THEN** the main screen shows a small filled gray circle near the top center

#### Scenario: Initial load (no cached data)
- **WHEN** `isLoading` is true AND `streak` is null (no cached data)
- **THEN** the widget shows the full "Laden..." loading state (existing behavior) and no refresh indicator

#### Scenario: Fetch completes
- **WHEN** `onReceive` is called with any response code
- **THEN** `isLoading` is set to false, the refresh indicator is removed, and the display is updated