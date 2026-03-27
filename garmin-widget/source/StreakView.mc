import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;
import Toybox.Communications;
import Toybox.Application.Properties;
import Toybox.Application.Storage;
import Toybox.ActivityMonitor;
import Toybox.Math;
import Toybox.Time;

class StreakView extends WatchUi.View {

    const CACHE_TTL_SECONDS = 1800; // legacy fallback only
    const MIN_REFRESH_INTERVAL_SECONDS = 420; // 7 minutes

    // Cached data
    var streak = null;
    var longest = null;
    var freezes = null;
    var nextMilestone = null;
    var daysToMilestone = null;
    var todaySteps = null;
    var stepGoal = 10000;
    var week = null;
    var isLoading = false;
    var isOffline = false;
    var showDetail = false;

    // Cached bitmap resources
    var shoeIcon = null;
    var snowflakeIcon = null;

    function initialize() {
        View.initialize();
    }

    function onLayout(dc as Graphics.Dc) as Void {
        shoeIcon = WatchUi.loadResource(Rez.Drawables.ShoeIcon);
        snowflakeIcon = WatchUi.loadResource(Rez.Drawables.SnowflakeIcon);
    }

    function onShow() as Void {
        var hasCachedData = loadCache();
        if (hasCachedData) {
            WatchUi.requestUpdate();
        }

        var cacheTimestamp = Storage.getValue("cacheTimestamp");
        var now = Time.now().value();

        // Minimum refresh interval guard (7 minutes)
        if (cacheTimestamp != null && (now - cacheTimestamp) < MIN_REFRESH_INTERVAL_SECONDS) {
            return;
        }

        // Server-driven staleness check with legacy fallback
        var storedRefreshAfter = Storage.getValue("refreshAfter");
        var isStale;
        if (storedRefreshAfter != null) {
            isStale = (now >= storedRefreshAfter);
        } else if (cacheTimestamp != null) {
            isStale = ((now - cacheTimestamp) > CACHE_TTL_SECONDS);
        } else {
            isStale = true;
        }

        if (isStale) {
            fetchData();
        }
    }

    function loadCache() as Lang.Boolean {
        var raw = Storage.getValue("cachedData");
        if (raw == null) {
            return false;
        }
        var cachedData = raw as Lang.Dictionary;
        streak = cachedData["streak"];
        longest = cachedData["longest"];
        freezes = cachedData["freezes"];
        nextMilestone = cachedData["next_milestone"];
        daysToMilestone = cachedData["days_to_milestone"];
        todaySteps = cachedData["today_steps"];
        if (cachedData["step_goal"] != null) {
            stepGoal = cachedData["step_goal"];
        }
        week = cachedData["week"] as Lang.Dictionary;
        return true;
    }

    function fetchData() as Void {
        var apiKey = Properties.getValue("apiKey");
        var apiUrl = Properties.getValue("apiUrl");

        if (apiKey == null || apiKey.equals("") || apiUrl == null || apiUrl.equals("")) {
            return;
        }

        isLoading = true;
        WatchUi.requestUpdate();

        var url = apiUrl + "/api/widget?key=" + apiKey;
        Communications.makeWebRequest(
            url,
            null,
            {
                :method => Communications.HTTP_REQUEST_METHOD_GET,
                :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON
            },
            method(:onReceive)
        );
    }

    function onReceive(responseCode as Lang.Number, data as Lang.Dictionary or Lang.String or Null) as Void {
        if (responseCode == 200 && data != null) {
            streak = data["streak"];
            longest = data["longest"];
            freezes = data["freezes"];
            nextMilestone = data["next_milestone"];
            daysToMilestone = data["days_to_milestone"];
            todaySteps = data["today_steps"];
            if (data["step_goal"] != null) {
                stepGoal = data["step_goal"];
            }
            week = data["week"] as Lang.Dictionary;
            Storage.setValue("cachedData", data);
            Storage.setValue("cacheTimestamp", Time.now().value());
            if (data["refreshAfter"] != null) {
                Storage.setValue("refreshAfter", data["refreshAfter"]);
            }
            isOffline = false;
        } else {
            var ts = Storage.getValue("cacheTimestamp");
            var isVeryStale = (ts != null && (Time.now().value() - ts) > 10800);
            isOffline = (streak != null) || isVeryStale;
        }

        isLoading = false;
        WatchUi.requestUpdate();
    }

    function getLiveSteps() as Lang.Number {
        var info = ActivityMonitor.getInfo();
        if (info != null && info.steps != null) {
            return info.steps;
        }
        return 0;
    }

    function onUpdate(dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();
        if (showDetail) {
            drawDetailScreen(dc, w, h);
        } else {
            drawMainScreen(dc, w, h);
        }
    }

    // ── Draw checkmark at position ──
    function drawCheck(dc, cx, cy, size) as Void {
        dc.setPenWidth(3);
        dc.drawLine(cx - size, cy, cx - size / 3, cy + size);
        dc.drawLine(cx - size / 3, cy + size, cx + size, cy - size);
        dc.setPenWidth(1);
    }

    // ── Screen 1: Main Glance ──
    function drawMainScreen(dc, w, h) as Void {
        dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_BLACK);
        dc.clear();

        if (isLoading && streak == null) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h / 2, Graphics.FONT_SMALL, "Laden...", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }

        if (streak == null) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h / 2 - 10, Graphics.FONT_SMALL, "Stel API key in", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.drawText(w / 2, h / 2 + 15, Graphics.FONT_XTINY, "via Connect IQ app", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            return;
        }

        var centerX = w / 2;
        var centerY = h / 2;
        var radius = w / 2 - 8; // Nearly full screen, just inside bezel

        // ── Refresh indicator (background refresh in progress) ──
        if (isLoading) {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.fillCircle(w * 50 / 100, h * 6 / 100, 4);
        }

        // ── Shoe icon (top center, bitmap) ──
        dc.drawBitmap(centerX - 20, centerY - radius + 20, shoeIcon);

        // ── Circular arc for today's step progress ──
        // Native-style: 360° arc 
        var arcStart = 90; // 12 o'clock
        var arcSpan = 360;  // total degrees of arc

        var liveSteps = getLiveSteps();
        var stepsForArc = liveSteps;
        if (stepsForArc == 0 && todaySteps != null) {
            stepsForArc = todaySteps;
        }

        var progress = 0.0;
        if (stepGoal > 0) {
            progress = stepsForArc.toFloat() / stepGoal.toFloat();
        }
        if (progress > 1.0) {
            progress = 1.0;
        }

        // Arc progress (orange) - fills clockwise from 12 o'clock toward 12 o'clock
        if (progress > 0.0) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.setPenWidth(4);
            var sweepDegrees = (progress * arcSpan.toFloat()).toNumber();
            var progressEnd = arcStart - sweepDegrees;
            if (progressEnd < 0) {
                progressEnd = progressEnd + 360;
            }
            dc.drawArc(centerX, centerY, radius, Graphics.ARC_CLOCKWISE, arcStart, progressEnd);
        }
        dc.setPenWidth(1);

        // ── Hero streak number (large, white, centered) ──
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(centerX, centerY - 20, Graphics.FONT_NUMBER_HOT, streak.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ── Freeze indicators (snowflake bitmaps below hero number) ──
        if (freezes != null && freezes > 0) {
            var freezeY = centerY + 35;
            if (freezes == 1) {
                dc.drawBitmap(centerX - 10, freezeY - 10, snowflakeIcon);
            } else if (freezes >= 2) {
                dc.drawBitmap(centerX - 24, freezeY - 10, snowflakeIcon);
                dc.drawBitmap(centerX + 4, freezeY - 10, snowflakeIcon);
            }
        }

        // ── Weekly status row (bottom, below the arc gap) ──
        if (week != null) {
            var rowY = h * 75 / 100;
            var totalWidth = w * 65 / 100;
            var spacing = totalWidth / 6;
            var startX = (w - totalWidth) / 2;

            for (var i = 0; i < 7; i++) {
                if (i >= week.size()) {
                    break;
                }
                var dayData = week[i];
                var posX = startX + i * spacing;
                var status = dayData["status"];
                var dayLetter = dayData["day"];

                // Real-time update for today
                if (i == 6 && status.equals("pending")) {
                    if (liveSteps >= stepGoal) {
                        status = "hit";
                    }
                }

                if (status.equals("hit")) {
                    dc.setColor(Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
                    drawCheck(dc, posX, rowY, 7);
                } else if (status.equals("freeze")) {
                    dc.drawBitmap(posX - 6, rowY - 8, snowflakeIcon);
                } else {
                    dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
                    dc.drawText(posX, rowY, Graphics.FONT_TINY, dayLetter, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
                }
            }
        }

        // ── Offline indicator ──
        if (isOffline) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h * 85 / 100, Graphics.FONT_XTINY, "offline", Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    // ── Screen 2: Milestone Detail ──
    function drawDetailScreen(dc, w, h) as Void {
        // Light background
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_WHITE);
        dc.clear();

        var centerX = w / 2;

        if (nextMilestone != null && daysToMilestone != null) {
            // "Volgende: X dagen" label
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 18 / 100, Graphics.FONT_XTINY, "Volgende: " + nextMilestone.toString() + " dagen", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            // Days remaining (large hero number)
            dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 33 / 100, Graphics.FONT_NUMBER_HOT, daysToMilestone.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            // "nog te gaan"
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 47 / 100, Graphics.FONT_XTINY, "nog te gaan", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            // Divider line
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawLine(w * 20 / 100, h * 56 / 100, w * 80 / 100, h * 56 / 100);

            // "Langste" label
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 63 / 100, Graphics.FONT_XTINY, "Langste", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            // Longest streak number
            dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 75 / 100, Graphics.FONT_NUMBER_MILD, longest != null ? longest.toString() : "0", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            // "dagen"
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 86 / 100, Graphics.FONT_XTINY, "dagen", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            // All milestones achieved — show only longest streak
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 30 / 100, Graphics.FONT_XTINY, "Langste", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            dc.setColor(Graphics.COLOR_BLACK, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 48 / 100, Graphics.FONT_NUMBER_HOT, longest != null ? longest.toString() : "0", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, h * 62 / 100, Graphics.FONT_XTINY, "dagen", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }
}
