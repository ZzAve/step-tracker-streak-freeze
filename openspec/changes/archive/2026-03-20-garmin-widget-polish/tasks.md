## 1. Arc Thickness

- [x] 1.1 Increase step progress arc `setPenWidth` from 2 to 4 in `drawMainScreen()`
- [x] 1.2 Verify arc does not overlap with shoe icon at top — shoe is placed at `centerY - radius + 20`, 20px inside the arc edge, no overlap

## 2. Checkmark Sizing

- [x] 2.1 Increase `drawCheck` size parameter from 5 to 7-8 (set to 7)
- [x] 2.2 Increase `drawCheck` pen width from 2 to 3

## 3. Element Contrast

- [x] 3.1 Change weekly row pending/not_met day letter color from `COLOR_DK_GRAY` to `COLOR_LT_GRAY`

## 4. Icon Size Review

- [x] 4.1 Compare shoe icon dimensions with native Garmin step counter icon and document any size difference
- [x] 4.2 If size difference is significant, note the target size (user will handle resizing)

## 5. Verification

- [x] 5.1 Test on Vivoactive 4 simulator — verify arc, checkmarks, and contrast improvements
