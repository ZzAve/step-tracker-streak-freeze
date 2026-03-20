# Design: Stappen Streak Garmin Widget

## Overview

A Connect IQ widget written in Monkey C that fetches streak data from a new lightweight API endpoint and displays: streak count, freeze shields, and next milestone progress on a Garmin watch.

## Architecture

```
┌──────────────┐         ┌──────────────────┐
│ Garmin Watch │──HTTP──▶│ Vercel API       │
│ (Widget)     │◀──JSON──│ /api/widget      │
└──────────────┘         └──────────────────┘
```

Two parts to build:

1. **`/api/widget` endpoint** — Lightweight API endpoint returning only widget-relevant data. Authenticated via a simple API key (watch can't do cookie-based sessions).

2. **Connect IQ Widget** — Monkey C project that calls the endpoint, parses JSON, and renders to the watch screen.

## API Endpoint

```
GET /api/widget?key=<user-api-key>
```

Response:

```json
{
  "streak": 23,
  "longest": 31,
  "freezes": 2,
  "next_milestone": 25,
  "days_to_milestone": 2
}
```

Simple API key auth — each user gets a key stored in the `users` table. No session cookies needed.

## Widget Layout (240x240 round screen)

```
        ┌─────────────┐
       ╱               ╲
      │     🔥  23       │
      │     dagen        │
      │                  │
      │  ●━━━━▪╌╌╌○╌╌○  │
      │  5  10  25 50 100│
      │                  │
      │  🛡️🛡️  2/2       │
       ╲               ╱
        └─────────────┘
```

- **Top**: Streak number (large) + fire icon
- **Middle**: Milestone progress bar with markers at 5, 10, 25, 50, 100
- **Bottom**: Freeze shield indicators

## Project Structure

```
garmin-widget/
├── manifest.xml          # App metadata, permissions, supported devices
├── monkey.jungle         # Build config
├── resources/
│   ├── strings.xml       # App name
│   └── drawables.xml     # (if needed)
└── source/
    ├── StreakApp.mc       # App entry point
    ├── StreakView.mc      # Widget view (renders UI)
    └── StreakDelegate.mc  # Input handling
```

## Authentication

Since Garmin widgets can't use browser sessions:

- Add `api_key` column to `users` table
- Generate a random key per user (shown in the web dashboard)
- User enters the key in the widget settings (Connect IQ app settings on phone)
- Widget sends key as query parameter

## Technical Details

- **Refresh**: Widget calls API on `onShow()` (when user swipes to it) + caches last result
- **Offline fallback**: Shows cached data with "(offline)" indicator if request fails
- **Min Connect IQ**: 3.1.0 (covers Vivoactive 4+, and most modern watches)
- **Permissions**: `Communications` (for HTTP requests)
- **Target devices**: Generic — supports round and rectangular screens, adapts layout at runtime
- **Language**: Monkey C (Connect IQ SDK)

## Data Flow

1. User swipes to widget → `onShow()` fires
2. Widget calls `Communications.makeWebRequest()` to `/api/widget?key=...`
3. API authenticates via key, runs `calculateStreak()`, returns compact JSON
4. Widget parses response, caches it, calls `requestUpdate()` to redraw
5. `onUpdate()` renders streak, milestones, and freezes to screen using `Dc` (drawing context)

## Decisions

- **API key over OAuth**: Simpler for a personal project. Key is entered once in widget settings.
- **Separate `/api/widget` endpoint**: Avoids sending full step history to the watch. Smaller payload, faster response.
- **Cache on device**: Shows last known data if offline. Updated each time widget is shown.
