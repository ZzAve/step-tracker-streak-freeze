## Context

The widget currently calls `fetchData()` in `onShow()`, which always initiates an HTTP request before any data is shown. Users see "Laden..." every time they open the widget. Garmin's Connect IQ SDK provides `Application.Storage` — a persistent key-value store that survives widget restarts — which is ideal for caching the last API response on-device.

Current flow: open widget → `onShow` → HTTP request → show data (after latency)
Target flow: open widget → `onShow` → load cache → show data immediately → if stale, background refresh → update display

## Goals / Non-Goals

**Goals:**
- Instant display of cached data on widget open
- Background refresh when cache is older than 30 minutes
- Visual refresh indicator visible during background fetch
- Cache persists across watch restarts (using `Application.Storage`)

**Non-Goals:**
- Cache invalidation on server-side data changes (pull-only model)
- Configurable TTL via Connect IQ settings
- Prefetching or push notifications
- Changes to the backend API

## Decisions

### D1: Use `Application.Storage` for persistence
**Chosen:** `Application.Storage.setValue` / `Application.Storage.getValue` with two keys: `"cachedData"` (Dictionary) and `"cacheTimestamp"` (Number, Unix epoch seconds via `Time.now().value()`).

**Alternatives considered:**
- In-memory only (`var` fields on the View): Data lost on every widget close. No improvement over current behavior.
- ObjectStore / file I/O: Not available in CIQ 3.x widgets; `Application.Storage` is the correct primitive.

### D2: Staleness threshold of 30 minutes
**Chosen:** If `Time.now().value() - cacheTimestamp > 1800`, trigger a background refresh.

**Rationale:** Streak data changes at most once per day (midnight rollover). 30 minutes is a reasonable balance between freshness and battery/data usage. The threshold is a compile-time constant (`CACHE_TTL_SECONDS = 1800`) to make it easy to adjust.

### D3: Show cached data first, refresh silently in background
**Chosen:** `onShow` loads from cache and calls `WatchUi.requestUpdate()` immediately. If stale, it also calls `fetchData()`. The existing `isLoading` flag drives a small refresh indicator.

**Alternatives considered:**
- Always block on fresh data: Reverts to current UX (loading delay every open).
- Show cache only, no auto-refresh: Data can become very stale; user has no way to force refresh.

### D4: Refresh indicator — small "(↻)" or "●" text label
**Chosen:** Render a small `FONT_XTINY` spinning/refresh label (e.g., `"↻"` or `"●"`) in the top-right corner of the main screen while `isLoading == true` AND cached data is already shown. This is the least intrusive indicator compatible with the MIP display rendering model (no animation frames).

**Rationale:** Connect IQ does not support animation timers that auto-invalidate; updating the display requires `WatchUi.requestUpdate()`. A static symbol is sufficient to communicate "refresh in progress".

## Risks / Trade-offs

- **Storage size limit**: `Application.Storage` has per-app quotas (varies by device, typically 16–64 KB). The API response is a small JSON dict (~300 bytes). Risk is negligible.
- **Clock skew**: If the watch clock is wrong, staleness detection may behave unexpectedly. → No mitigation needed; this is an edge case with negligible user impact.
- **First launch (no cache)**: Behavior is unchanged — `isLoading` shows "Laden..." until first successful fetch. Cache is populated after the first successful response.
- **Failed refresh with valid cache**: If a background refresh fails (HTTP error), the existing `isOffline` logic keeps showing cached data with "(offline)". The refresh indicator disappears when the request completes (success or failure).

## Migration Plan

No migration required. `Application.Storage` returns `null` for unknown keys, so the first launch after the update simply treats the empty cache as a miss and fetches normally. Backward compatible.
