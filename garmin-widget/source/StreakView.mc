import Toybox.Graphics;
import Toybox.WatchUi;
import Toybox.Communications;
import Toybox.Application.Properties;

class StreakView extends WatchUi.View {

    // Cached data
    var streak = null;
    var longest = null;
    var freezes = null;
    var nextMilestone = null;
    var daysToMilestone = null;
    var isLoading = false;
    var isOffline = false;

    var MILESTONES = [5, 10, 25, 50, 100];

    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        fetchData();
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

    function onReceive(responseCode as Number, data as Dictionary or Null) as Void {
        isLoading = false;

        if (responseCode == 200 && data != null) {
            streak = data["streak"];
            longest = data["longest"];
            freezes = data["freezes"];
            nextMilestone = data["next_milestone"];
            daysToMilestone = data["days_to_milestone"];
            isOffline = false;
        } else {
            // Keep cached data, mark offline
            isOffline = (streak != null);
        }

        WatchUi.requestUpdate();
    }

    function onUpdate(dc as Dc) as Void {
        var w = dc.getWidth();
        var h = dc.getHeight();

        // Background
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

        // ── Streak number (top section) ──
        var streakY = h * 18 / 100;

        // Fire symbol
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY - 5, Graphics.FONT_MEDIUM, "~", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Streak count — large
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY + 28, Graphics.FONT_NUMBER_HOT, streak.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // "dagen" label
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY + 60, Graphics.FONT_XTINY, "dagen", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ── Milestone bar (middle) ──
        var barY = h * 58 / 100;
        var barLeft = w * 12 / 100;
        var barRight = w * 88 / 100;
        var barWidth = barRight - barLeft;

        // Background line
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(barLeft, barY, barRight, barY);

        // Filled line
        var maxMs = 100;
        var currentStreak = streak;
        if (currentStreak > maxMs) { currentStreak = maxMs; }
        var fillEnd = barLeft + barWidth * currentStreak / maxMs;
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(barLeft, barY, fillEnd, barY);

        // Milestone dots
        for (var i = 0; i < MILESTONES.size(); i++) {
            var ms = MILESTONES[i];
            var x = barLeft + barWidth * ms / maxMs;
            var achieved = (streak >= ms);

            if (achieved) {
                dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x, barY, 5);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.drawCircle(x, barY, 5);
            }

            // Label below
            dc.setColor(achieved ? Graphics.COLOR_ORANGE : Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x, barY + 12, Graphics.FONT_XTINY, ms.toString(), Graphics.TEXT_JUSTIFY_CENTER);
        }

        // "Nog X!" text if close to next milestone
        if (daysToMilestone != null && daysToMilestone <= 3) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, barY + 26, Graphics.FONT_XTINY, "Nog " + daysToMilestone.toString() + "!", Graphics.TEXT_JUSTIFY_CENTER);
        }

        // ── Freeze shields (bottom) ──
        var shieldY = h * 82 / 100;

        // Draw shield circles
        for (var j = 0; j < 2; j++) {
            var sx = w / 2 - 20 + j * 22;
            if (freezes != null && freezes > j) {
                dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            }
            dc.fillCircle(sx, shieldY, 6);
        }

        // Freeze count text
        var freezeCount = (freezes != null) ? freezes : 0;
        var freezeText = freezeCount.toString() + "/2";
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2 + 20, shieldY, Graphics.FONT_XTINY, freezeText, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);

        // ── Offline indicator ──
        if (isOffline) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h - 12, Graphics.FONT_XTINY, "(offline)", Graphics.TEXT_JUSTIFY_CENTER);
        }
    }
}
