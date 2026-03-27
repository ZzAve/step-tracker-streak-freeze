## Context

The Garmin widget currently caches API responses on-device using `Application.Storage` with a hardcoded 30-minute TTL (`CACHE_TTL_SECONDS = 1800`). The backend syncs with Garmin on a 1-hour cooldown (`SYNC_COOLDOWN_MS`). These two timers are independent — the widget has no knowledge of when the backend last synced or when new data might be available. This leads to unnecessary fetches (widget refreshes but backend has nothing new) and suboptimal freshness (widget waits 30 minutes even if backend just synced fresh data).

## Goals / Non-Goals

**Goals:**
- Let the backend control widget cache duration via `refreshAfter` timestamp in the API response
- Give the widget visibility into data freshness via `lastUpdatedAt` timestamp
- Prevent excessive API calls with a 7-minute minimum refresh interval on the widget
- Maintain backward compatibility — older widgets ignore unknown fields

**Non-Goals:**
- Push notifications or server-initiated cache invalidation
- Configurable refresh intervals per user
- HTTP-level caching headers (Cache-Control, ETag) — the widget uses `Application.Storage`, not HTTP cache
- Changing the backend sync cooldown duration

## Decisions

### D1: `refreshAfter` is computed from `last_synced_at + SYNC_COOLDOWN_MS`

The backend already tracks `last_synced_at` and has a 1-hour sync cooldown. Rather than introducing a separate cache duration config, `refreshAfter` is derived as `last_synced_at + SYNC_COOLDOWN_MS`. This means the widget knows exactly when the backend will next attempt a Garmin sync, which is the earliest point at which new data could appear.

**Alternative considered:** A configurable TTL independent of sync cooldown. Rejected because it adds complexity with no benefit — there's no point refreshing before the backend can have new data.

### D2: Timestamps use ISO 8601 strings in the JSON response

Monkey C can parse ISO 8601 via `Gregorian.moment()` or manual parsing. ISO 8601 is human-readable and timezone-unambiguous. Unix epoch integers would be simpler to parse but less debuggable.

**Alternative considered:** Unix epoch seconds. Simpler to compare on the widget but harder to debug in logs. Given that both the widget and backend need to handle time comparisons, and the widget already works with `Time.now().value()` (epoch seconds), we'll use **epoch seconds (Number)** for both fields to keep widget-side parsing trivial. The widget already stores `cacheTimestamp` as epoch seconds.

**Revised decision:** Use epoch seconds (Number) for both `lastUpdatedAt` and `refreshAfter` to match existing widget time conventions and avoid string parsing complexity on Monkey C.

### D3: Widget stores `refreshAfter` from server response, not a computed local TTL

The widget saves the `refreshAfter` value from the API response alongside the cached data. On next open, it compares `Time.now().value()` against the stored `refreshAfter`. This keeps the server in control of refresh timing.

### D4: 7-minute minimum refresh interval is enforced on the widget

Even if `refreshAfter` is in the past (e.g., the widget was closed for hours), the widget will not fetch if less than 7 minutes have passed since the last successful fetch. This uses the existing `cacheTimestamp` mechanism. The 7-minute floor prevents rapid repeated fetches when the user opens/closes the widget frequently.

**Rationale for 7 minutes:** Balances freshness with battery/data conservation. The widget is a glance — users don't need sub-minute freshness for daily step streaks.

### D5: Backward compatibility via additive response fields

`lastUpdatedAt` and `refreshAfter` are new fields added to the existing response object. Older widget versions that don't know about these fields will simply ignore them (Monkey C dictionary access for unknown keys returns null). No versioning needed.

## Risks / Trade-offs

- **[Risk] Clock skew between watch and server** → Both `refreshAfter` and `lastUpdatedAt` are server-generated timestamps compared against the watch's `Time.now()`. If the watch clock is significantly off, staleness checks will be wrong. Mitigation: The 7-minute minimum floor uses the widget's own timestamps (consistent with itself), limiting the impact to the server-driven TTL only. Garmin watches sync time via phone, so drift should be minimal.

- **[Risk] `last_synced_at` is null for new users** → If a user has never synced, `last_synced_at` is null. Mitigation: When null, set `refreshAfter` to current time (fetch immediately) and `lastUpdatedAt` to 0 (no data yet).

- **[Trade-off] Widget minimum floor is hardcoded** → The 7-minute floor can't be changed without a widget update. Acceptable because it's a safety floor, not the primary TTL mechanism. The server controls the real refresh timing via `refreshAfter`.