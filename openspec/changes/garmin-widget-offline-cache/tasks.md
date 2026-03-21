## 1. Cache Write — Persist API Response

- [x] 1.1 Add `import Toybox.Application.Storage` and `import Toybox.Time` to `StreakView.mc`
- [x] 1.2 Define constant `CACHE_TTL_SECONDS = 1800` at the top of `StreakView`
- [x] 1.3 In `onReceive`, after a successful 200 response, call `Storage.setValue("cachedData", data)` and `Storage.setValue("cacheTimestamp", Time.now().value())`

## 2. Cache Read — Load on Open

- [x] 2.1 Add a `loadCache()` helper function that reads `Storage.getValue("cachedData")` and `Storage.getValue("cacheTimestamp")` and applies the data fields to view variables (same logic as the success branch in `onReceive`)
- [x] 2.2 In `onShow`, call `loadCache()` before `fetchData()` so cached data is applied immediately
- [x] 2.3 Call `WatchUi.requestUpdate()` after `loadCache()` if cached data was found

## 3. Staleness Check — Conditional Background Refresh

- [x] 3.1 In `onShow`, after loading the cache, check if `cacheTimestamp` is null or older than `CACHE_TTL_SECONDS` seconds
- [x] 3.2 Only call `fetchData()` if the cache is stale or absent (skip the fetch if cache is fresh)

## 4. Refresh Indicator

- [x] 4.1 In `drawMainScreen`, add a branch: if `isLoading == true` AND `streak != null`, draw a `"↻"` symbol using `FONT_XTINY` in `COLOR_LT_GRAY` at a corner position (e.g., top-right: `x = w * 90 / 100`, `y = h * 8 / 100`)
- [x] 4.2 Verify the indicator does NOT appear during the initial full-loading state (when `streak == null`)
- [x] 4.3 Verify the indicator disappears after `onReceive` completes (both success and failure paths)

## 5. Verification

- [ ] 5.1 Test: open widget with no cache → "Laden..." shown → fetch completes → data displayed and written to cache
- [ ] 5.2 Test: close and reopen widget within 30 minutes → cached data shown immediately, no fetch initiated
- [ ] 5.3 Test: simulate stale cache (set timestamp to 0) → cached data shown immediately + refresh indicator + fetch runs in background → indicator disappears on completion
- [ ] 5.4 Test: offline with cached data → cached data shown + "(offline)" indicator (existing behavior preserved)

