## MODIFIED Requirements

### Requirement: Widget refreshes stale cache in the background
The widget SHALL determine cache staleness using the server-provided `refreshAfter` value (stored in `Application.Storage` under key `"refreshAfter"`). The cache is stale when `Time.now().value() >= refreshAfter`. If `refreshAfter` is not available (legacy cache), the widget SHALL fall back to the previous behavior of checking if the cache is older than 1800 seconds. Additionally, the widget SHALL NOT fetch if less than 420 seconds (7 minutes) have elapsed since the last successful fetch (`cacheTimestamp`), regardless of staleness.

#### Scenario: Cache is fresh (current time before refreshAfter)
- **WHEN** the user opens the widget and the stored `refreshAfter` is in the future and `cacheTimestamp` is irrelevant
- **THEN** the widget displays cached data and does NOT initiate an HTTP fetch

#### Scenario: Cache is stale (current time at or after refreshAfter) and minimum interval passed
- **WHEN** the user opens the widget, the stored `refreshAfter` is in the past, and `cacheTimestamp` is 420 or more seconds old
- **THEN** the widget displays the cached data immediately AND initiates a background HTTP fetch

#### Scenario: Cache is stale but minimum interval not passed
- **WHEN** the user opens the widget, the stored `refreshAfter` is in the past, but `cacheTimestamp` is less than 420 seconds old
- **THEN** the widget displays cached data and does NOT initiate an HTTP fetch

#### Scenario: Legacy cache without refreshAfter
- **WHEN** the user opens the widget and `Application.Storage` has no `"refreshAfter"` entry but has `"cacheTimestamp"`
- **THEN** the widget falls back to treating cache as stale if `cacheTimestamp` is 1800 or more seconds old

#### Scenario: Cache is absent (treated as infinitely stale)
- **WHEN** there is no `"cacheTimestamp"` in `Application.Storage`
- **THEN** the widget treats the cache as stale and initiates an HTTP fetch