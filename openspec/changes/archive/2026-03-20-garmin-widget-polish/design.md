## Context

The widget was recently redesigned (garmin-widget-redesign change) with a new layout: shoe icon, circular arc, hero streak number, freeze snowflakes, and weekly status row. Comparing side-by-side with the native Garmin step counter widget on a Vivoactive 4, several visual differences stand out that make our widget feel less polished.

Current values in `StreakView.mc`:
- Arc pen width: 2px
- Checkmarks: drawn with `drawCheck()` using pen width 2 and size 5
- Colors: standard `Graphics.COLOR_WHITE`, `Graphics.COLOR_GREEN`, etc.
- Shoe icon: loaded from `shoe_icon.png` (size TBD — needs comparison with native)

## Goals / Non-Goals

**Goals:**
- Match the visual quality and readability of native Garmin widgets
- Thicker step progress arc to match native ring indicator
- Brighter, higher-contrast elements for MIP display readability
- Larger, more visible checkmarks in the weekly row
- Confirm shoe icon sizing is proportional to native widget icon

**Non-Goals:**
- Changing the layout or information architecture (already validated)
- Adding new data fields or API changes
- Supporting additional devices beyond current target list

## Decisions

### Arc thickness
Increase `setPenWidth` from 2 to 4 for the step progress arc. The native Garmin widget ring appears roughly 2x thicker than our current arc. A width of 4 should closely match.

### Element contrast
Use brighter color values where the standard Garmin palette allows. Specifically:
- Weekly row day letters: switch from `COLOR_DK_GRAY` to `COLOR_LT_GRAY` for unmet days
- Checkmarks: keep `COLOR_GREEN` (already bright)
- Consider using `COLOR_WHITE` for the step arc background track (currently commented out) to add a subtle guide ring

### Checkmark sizing
Increase the `drawCheck` size parameter from 5 to 7-8 and pen width from 2 to 3. The native widget checkmarks are noticeably larger and bolder.

### Icon size investigation
Compare our shoe icon pixel dimensions against the native step counter icon. If ours is significantly smaller, regenerate at the appropriate size. The user will handle any PNG resizing.

## Risks / Trade-offs

- [Thicker arc may overlap with shoe icon at top] → Adjust shoe icon Y position if needed
- [Brighter unmet-day letters may reduce contrast with hit-day checkmarks] → Test on simulator, revert if weekly row becomes visually noisy
