## 1. Backend: Add cache timestamps to widget API response

- [x] 1.1 Add `lastUpdatedAt` field to `/api/widget` response: derive from `user.last_synced_at` as epoch seconds (0 when null)
- [x] 1.2 Add `refreshAfter` field to `/api/widget` response: compute as `last_synced_at + SYNC_COOLDOWN_MS` in epoch seconds (current server time when `last_synced_at` is null)
- [x] 1.3 Add/update backend tests to verify `lastUpdatedAt` and `refreshAfter` values in widget API response for both synced and never-synced users

## 2. Widget: Server-driven cache staleness

- [x] 2.1 Store `refreshAfter` from API response to `Application.Storage` under key `"refreshAfter"` on successful fetch (preserve on failure)
- [x] 2.2 Replace hardcoded `CACHE_TTL_SECONDS` staleness check with `refreshAfter`-based logic: stale when `Time.now().value() >= refreshAfter`
- [x] 2.3 Add fallback for legacy cache: if no `"refreshAfter"` in storage, fall back to 1800-second TTL check against `cacheTimestamp`

## 3. Widget: Minimum refresh interval

- [x] 3.1 Add `MIN_REFRESH_INTERVAL_SECONDS = 420` constant (7 minutes)
- [x] 3.2 Add minimum interval guard: skip fetch if `(Time.now().value() - cacheTimestamp) < 420`, regardless of `refreshAfter`

## 4. Cleanup and verification

- [x] 4.1 Remove `CACHE_TTL_SECONDS` constant (replaced by server-driven `refreshAfter` with legacy fallback)
- [x] 4.2 Verify end-to-end: build widget, run backend tests, confirm response includes new fields