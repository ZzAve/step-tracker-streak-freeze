## 1. API Changes

- [x] 1.1 Add `step_goal` field (hardcoded 10000) to `/api/widget` response
- [x] 1.2 Expose per-day annotations from streak calculation — modify `calculateStreak()` or add helper to return day-level hit/freeze/not_met status for the past 6 days
- [x] 1.3 Add `week` array to `/api/widget` response — 7 objects with `day` (letter) and `status` (hit/freeze/not_met/pending), today always "pending"
- [x] 1.4 Test API response includes new fields with correct structure

## 2. Widget Resources

- [x] 2.1 Create shoe/sneaker bitmap icon (PNG) for widget — appropriately sized for Garmin displays
- [x] 2.2 Add shoe icon to `drawables.xml` as a bitmap resource
- [x] 2.3 Remove or update any unused icon resources from the old design

## 3. Widget Screen 1 — Main Glance

- [x] 3.1 Draw shoe bitmap icon centered at top of screen
- [x] 3.2 Draw circular arc (orange) representing today's steps / step_goal — use `drawArc()` with ActivityMonitor fallback to API `today_steps`
- [x] 3.3 Draw hero streak number (large, white, centered) inside the arc
- [x] 3.4 Draw freeze indicators (❄ symbols, blue, centered) below hero number — 0, 1, or 2 based on `freezes` count
- [x] 3.5 Draw weekly status row at bottom — 7 positions showing ✓ (green, hit), ❄ (blue, freeze), or day letter (gray, not_met/pending)
- [x] 3.6 Real-time today column: update today's position from pending letter to ✓ when ActivityMonitor steps >= step_goal
- [x] 3.7 Cache `step_goal` and `week` data from API response alongside existing cached fields

## 4. Widget Screen 2 — Milestone Detail

- [x] 4.1 Implement detail screen rendering with light/white background
- [x] 4.2 Draw "Volgende" label + next milestone number (large) + "dagen" + "nog X te gaan"
- [x] 4.3 Draw divider line
- [x] 4.4 Draw "Langste" label + longest streak number + "dagen"
- [x] 4.5 Handle edge case: all milestones achieved (next_milestone is null) — show only longest streak

## 5. Widget Navigation

- [x] 5.1 Add `showDetail` boolean state to StreakView
- [x] 5.2 Implement `onSelect` in StreakDelegate to toggle `showDetail` and trigger `requestUpdate()`
- [x] 5.3 Branch `onUpdate` rendering based on `showDetail` flag (screen 1 vs screen 2)

## 6. Cleanup & Testing

- [x] 6.1 Remove old layout code (fire icon drawing, horizontal progress bar, freeze shields with "X/2", step count display)
- [x] 6.2 Test on simulator with round screen device (Vivoactive 4)
- [x] 6.3 Verify offline mode still works (cached data + indicator)
- [x] 6.4 Verify "no API key" state still shows setup instructions
