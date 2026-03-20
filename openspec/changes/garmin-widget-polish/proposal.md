## Why

The custom Garmin widget looks noticeably less polished than the native Garmin step counter widget. Side-by-side comparison on the Vivoactive 4 reveals differences in element sizing, contrast, and arc thickness that make our widget feel like a prototype rather than a native-quality app.

## What Changes

- Increase the step progress arc pen width to match native Garmin thickness (~2x current)
- Increase brightness/contrast of text and icon elements for better readability on MIP displays
- Make weekly row checkmarks larger and more visible to match native checkmark sizing
- Verify shoe icon sizing matches native proportions (investigate if size difference exists)

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `connect-iq-widget`: Visual polish — thicker arc, brighter elements, larger checkmarks, icon size review

## Impact

- `garmin-widget/source/StreakView.mc` — arc pen width, color values, checkmark sizing, element positioning
- `garmin-widget/resources/` — potentially resized icon PNGs if size difference is confirmed
