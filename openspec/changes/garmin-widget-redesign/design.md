## Context

The Garmin widget currently uses a custom layout with a fire icon, horizontal milestone progress bar, freeze shields with "X/2" text, and a step count. Native Garmin widgets (steps, floors, intensity minutes, calories) follow a consistent visual pattern: small icon at top, circular arc for progress, large centered hero number, and a weekly status row at the bottom. The widget needs a full UI overhaul to match this native look, plus a second detail screen (accessible via press/select) for milestone and longest streak info.

The API currently returns `streak`, `longest`, `freezes`, `next_milestone`, `days_to_milestone`, and `today_steps`. It does not return per-day history or the step goal.

## Goals / Non-Goals

**Goals:**
- Align widget UX with native Garmin widget patterns (arc, icon, hero number, weekly row)
- Add two-screen navigation (main glance + milestone detail)
- Surface per-day streak history (hit/freeze/not_met/pending) in a weekly row
- Use ActivityMonitor for real-time step data on the arc and today's weekly column
- Pass step goal from API to avoid hardcoding in widget

**Non-Goals:**
- Changing the step goal logic (remains 10,000 from the backend)
- Adding new sync mechanisms or changing sync frequency
- Supporting watch faces or other app types
- Duplicating native step counter functionality (no weekly step bar chart)
- Changing the existing API authentication mechanism

## Decisions

### 1. Shoe bitmap icon instead of drawn fire icon
Use a small PNG bitmap for the shoe/sneaker icon at the top of screen 1.

**Why**: Monkey C's `fillPolygon()` is tedious for complex shapes and looks jagged at small sizes. A bitmap gives crisp results and is easy to swap. Native Garmin widgets use bitmap icons too.

**Alternatives considered**: Drawing with `fillPolygon()` — rejected for visual quality reasons. Using the fire icon — rejected because it collides with Garmin's calories widget icon.

### 2. Circular arc for today's steps progress
The arc represents `todaySteps / stepGoal`, filled clockwise in orange. Source: `ActivityMonitor.getInfo().steps` for real-time data, falling back to API `today_steps`.

**Why**: Every native Garmin widget uses a circular arc for its primary progress metric. This is the single strongest visual pattern to match.

**Alternatives considered**: Arc for milestone progress — rejected because it doesn't change during the day (no real-time feedback). Keeping the horizontal bar — rejected as it doesn't match native patterns.

### 3. Hero number is streak count, not steps
The large centered number shows the streak in days, not today's step count.

**Why**: The streak is the unique value proposition of this widget. Today's steps are already on the native steps widget. The arc provides the "am I on track today?" feedback.

### 4. Freeze display as centered snowflake symbols
Show 0, 1, or 2 snowflake (❄) characters centered below the hero number. No gray placeholders for missing freezes.

**Why**: Clean and minimal. The number of symbols tells you instantly how many you have. No need for "X/2" text or gray empty slots.

**Alternatives considered**: Flanking the hero number — too wide. On the arc — too subtle. Near the icon — disconnected from the streak context.

### 5. Weekly row with three visual states
Past 6 days + today. Each position shows one of:
- Checkmark (✓) in green: step goal was met
- Snowflake (❄) in blue: freeze was used
- Day letter in gray: goal not met, or today pending

Today's position updates in real-time via ActivityMonitor — switches from letter to ✓ when steps >= goal.

**Why**: Mirrors the native floors widget pattern (checkmark replaces day letter on success). Adding freeze as a third state is natural since the widget already has the freeze concept.

### 6. Second screen via onSelect (press/tap)
Pressing the widget toggles between screen 1 (main glance) and screen 2 (milestone detail). A boolean `showDetail` flag in StreakView tracks the current screen.

**Why**: On Vivoactive 4, pressing the touchscreen or the action button on a widget opens a detail view. This matches native widget behavior.

### 7. Screen 2 uses light background
The milestone/longest streak detail screen uses a white/light background with dark text, mimicking native Garmin second screens (e.g., intensity minutes detail).

**Why**: Direct match with native Garmin UX. Provides clear visual distinction between the two screens.

### 8. API returns per-day week history
Add a `week` array to the `/api/widget` response with 7 entries (past 6 days + today), each containing `day` (letter) and `status` (hit/freeze/not_met/pending).

**Why**: The widget needs this data for the weekly row but cannot compute it locally — it requires server-side streak calculation context to know which days had freezes applied vs. simply missed.

### 9. API returns step_goal
Add `step_goal` to the `/api/widget` response.

**Why**: Removes the hardcoded 10,000 from the widget. If the goal changes in the future, only the backend needs updating.

## Risks / Trade-offs

**[Bitmap icon size across devices]** → The shoe icon needs to look good on screens from 218px (Vivoactive 4S) to 280px (Fenix 7X). Mitigation: use a single icon size that works at the smallest resolution; Monkey C scales bitmaps.

**[ActivityMonitor availability]** → Some older devices or permissions might not provide `ActivityMonitor`. Mitigation: fall back to API `today_steps` (already cached). Arc shows last-known value.

**[Week history accuracy]** → The `week` array depends on the streak engine's per-day annotations. If the streak engine's logic changes, the history could be inconsistent. Mitigation: derive from the same `calculateStreak()` function used for the streak count.

**[Snowflake rendering]** → Monkey C may not render ❄ (Unicode snowflake) on all devices. Mitigation: use a simple drawn shape (filled circle with lines) or a tiny bitmap if the character isn't available. Test on target devices.

**[Screen 2 navigation confusion]** → Users might not discover the second screen. Mitigation: acceptable — native Garmin widgets have the same discoverability issue and don't add hints. Power users will find it.
