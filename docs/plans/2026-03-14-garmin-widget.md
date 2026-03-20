# Garmin Streak Widget Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Connect IQ widget that shows streak count, freeze shields, and milestone progress on a Garmin watch, powered by a new `/api/widget` endpoint.

**Architecture:** Two components — (1) a new Vercel serverless endpoint `/api/widget` that returns compact streak data authenticated via API key, and (2) a Connect IQ widget in Monkey C that fetches and displays this data. The widget refreshes on `onShow()` and caches the last result for offline display.

**Tech Stack:** Node.js (Vercel serverless), Monkey C (Connect IQ SDK 3.1.0+), Neon Postgres

---

### Task 1: Add `api_key` column to users table

**Files:**
- Modify: `lib/db.js:26-34` (add `api_key` column to users table creation)

**Step 1: Add api_key column to the CREATE TABLE statement**

In `lib/db.js`, update the `users` table creation to include the new column:

```js
await sql`
  CREATE TABLE IF NOT EXISTS users (
    id                SERIAL PRIMARY KEY,
    garmin_user_id    VARCHAR UNIQUE NOT NULL,
    garmin_tokens     JSONB,
    api_key           VARCHAR(64) UNIQUE,
    created_at        TIMESTAMP DEFAULT NOW(),
    last_synced_at    TIMESTAMP
  )
`;
```

**Step 2: Add migration for existing databases**

Add after the existing CREATE TABLE statements in `initializeDatabase()`:

```js
// Migration: add api_key column if it doesn't exist
await sql`
  ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE
`;
```

**Step 3: Commit**

```bash
git add lib/db.js
git commit -m "feat: add api_key column to users table"
```

---

### Task 2: Add API key generation helper

**Files:**
- Modify: `lib/session.js` (add `generateApiKey` function)

**Step 1: Add the generateApiKey function**

Add to the bottom of `lib/session.js`, before `module.exports`:

```js
/**
 * Generate a random 32-byte hex API key.
 * @returns {string} 64-character hex string
 */
function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}
```

**Step 2: Export the function**

Update the `module.exports` to include `generateApiKey`:

```js
module.exports = { createSessionCookie, getUserFromSession, clearSessionCookie, sign, unsign, generateApiKey };
```

**Step 3: Commit**

```bash
git add lib/session.js
git commit -m "feat: add generateApiKey helper"
```

---

### Task 3: Create `/api/widget` endpoint

**Files:**
- Create: `api/widget.js`
- Reference: `api/steps.js` (for pattern), `lib/streak.js` (for calculateStreak)

**Step 1: Write the endpoint**

Create `api/widget.js`:

```js
'use strict';

const { sql, initializeDatabase } = require('../lib/db');
const { fetchDailySteps } = require('../lib/garmin');
const { calculateStreak, STEP_GOAL } = require('../lib/streak');

const MILESTONES = [5, 10, 25, 50, 100];
const SYNC_COOLDOWN_MS = 60 * 60 * 1000;

function daysAgoDateStr(daysAgo) {
  const d = new Date();
  d.setUTCHours(12);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  const d = new Date();
  d.setUTCHours(12);
  return d.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end();
    return;
  }

  try {
    await initializeDatabase();

    // --- API key auth ---
    const apiKey = req.query.key;
    if (!apiKey) {
      res.status(401).json({ error: 'Missing API key' });
      return;
    }

    const userResult = await sql`
      SELECT id, garmin_tokens, last_synced_at
      FROM users
      WHERE api_key = ${apiKey}
    `;
    if (userResult.length === 0) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }
    const user = userResult[0];

    // --- Sync if needed (same logic as /api/steps) ---
    const now = Date.now();
    const lastSynced = user.last_synced_at ? new Date(user.last_synced_at).getTime() : 0;
    const needsSync = now - lastSynced >= SYNC_COOLDOWN_MS;

    if (needsSync && user.garmin_tokens) {
      const existingResult = await sql`
        SELECT date FROM daily_steps WHERE user_id = ${user.id} ORDER BY date DESC LIMIT 1
      `;
      const hasExistingData = existingResult.length > 0;
      let startDate;
      if (!hasExistingData) {
        startDate = daysAgoDateStr(60);
      } else {
        const dateObj = new Date(existingResult[0].date);
        startDate = dateObj.toISOString().slice(0, 10);
      }
      const endDate = todayStr();

      try {
        const stepRecords = await fetchDailySteps(user.garmin_tokens, startDate, endDate);
        for (const record of stepRecords) {
          const goalMet = record.steps >= STEP_GOAL;
          await sql`
            INSERT INTO daily_steps (user_id, date, steps, goal_met)
            VALUES (${user.id}, ${record.date}, ${record.steps}, ${goalMet})
            ON CONFLICT (user_id, date)
            DO UPDATE SET steps = EXCLUDED.steps, goal_met = EXCLUDED.goal_met
          `;
        }
        await sql`UPDATE users SET last_synced_at = NOW() WHERE id = ${user.id}`;
      } catch (err) {
        // Sync failure is non-fatal for widget — we'll use stale data
        console.error('Widget sync error:', err.message);
      }
    }

    // --- Fetch steps & calculate streak ---
    const stepsResult = await sql`
      SELECT date, steps, goal_met
      FROM daily_steps
      WHERE user_id = ${user.id}
      ORDER BY date ASC
    `;
    const allSteps = stepsResult.map((row) => ({
      date: row.date instanceof Date
        ? `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
        : String(row.date).slice(0, 10),
      steps: row.steps,
      goal_met: row.goal_met,
    }));

    const streak = calculateStreak(allSteps, null);

    // --- Compute milestone info ---
    let nextMilestone = null;
    let daysToMilestone = null;
    for (const ms of MILESTONES) {
      if (streak.current_streak < ms) {
        nextMilestone = ms;
        daysToMilestone = ms - streak.current_streak;
        break;
      }
    }

    // --- Compact response ---
    res.status(200).json({
      streak: streak.current_streak,
      longest: streak.longest_streak,
      freezes: streak.freeze_count,
      next_milestone: nextMilestone,
      days_to_milestone: daysToMilestone,
    });
  } catch (err) {
    console.error('Error in /api/widget:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Step 2: Commit**

```bash
git add api/widget.js
git commit -m "feat: add /api/widget endpoint for Garmin watch"
```

---

### Task 4: Create API key management endpoint

**Files:**
- Create: `api/apikey.js`

**Step 1: Write the endpoint**

Create `api/apikey.js` — generates and returns an API key for the authenticated user:

```js
'use strict';

const { sql, initializeDatabase } = require('../lib/db');
const { getUserFromSession, generateApiKey } = require('../lib/session');

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET, POST').end();
    return;
  }

  try {
    await initializeDatabase();

    const userId = getUserFromSession(req);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.method === 'GET') {
      // Return existing key (masked) or null
      const result = await sql`SELECT api_key FROM users WHERE id = ${userId}`;
      const key = result[0]?.api_key || null;
      res.status(200).json({ api_key: key });
      return;
    }

    // POST — generate new key
    const newKey = generateApiKey();
    await sql`UPDATE users SET api_key = ${newKey} WHERE id = ${userId}`;
    res.status(200).json({ api_key: newKey });
  } catch (err) {
    console.error('Error in /api/apikey:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

**Step 2: Commit**

```bash
git add api/apikey.js
git commit -m "feat: add /api/apikey endpoint for key generation"
```

---

### Task 5: Add API key display to web dashboard

**Files:**
- Modify: `public/index.html` (add API key section below sync footer)

**Step 1: Add API key UI section**

In `public/index.html`, add after the `<div class="sync-footer" id="sync-footer"></div>` line:

```html
<!-- API Key for Garmin Widget -->
<div class="card" style="margin-top: 1rem;">
  <div class="card-label">Garmin Widget</div>
  <div id="apikey-section" style="font-size: 0.85rem;">
    <div id="apikey-display" style="display: none; word-break: break-all;">
      <span style="color: var(--text-muted);">API Key:</span>
      <code id="apikey-value" style="color: var(--accent); font-size: 0.8rem;"></code>
    </div>
    <button class="btn-connect" id="btn-generate-key"
      style="font-size: 0.8rem; padding: 0.5rem 1rem; margin-top: 0.5rem;">
      Genereer API Key
    </button>
    <p style="color: var(--text-muted); font-size: 0.7rem; margin-top: 0.5rem;">
      Voer deze key in bij de Garmin Connect IQ widget instellingen.
    </p>
  </div>
</div>
```

**Step 2: Add JavaScript for API key management**

Add inside the IIFE in the `<script>` section, after the login form event listener:

```js
// ── API Key ───────────────────────────────────────────
document.getElementById('btn-generate-key').addEventListener('click', async () => {
  const btn = document.getElementById('btn-generate-key');
  btn.disabled = true;
  btn.textContent = 'Bezig…';
  try {
    const res = await fetch('/api/apikey', { method: 'POST' });
    const data = await res.json();
    if (data.api_key) {
      document.getElementById('apikey-value').textContent = data.api_key;
      document.getElementById('apikey-display').style.display = 'block';
      btn.textContent = 'Nieuwe Key Genereren';
    }
  } catch (err) {
    btn.textContent = 'Fout — probeer opnieuw';
  } finally {
    btn.disabled = false;
  }
});

// Load existing key on dashboard init
async function loadApiKey() {
  try {
    const res = await fetch('/api/apikey');
    const data = await res.json();
    if (data.api_key) {
      document.getElementById('apikey-value').textContent = data.api_key;
      document.getElementById('apikey-display').style.display = 'block';
      document.getElementById('btn-generate-key').textContent = 'Nieuwe Key Genereren';
    }
  } catch {}
}
```

**Step 3: Call `loadApiKey()` in `renderDashboard()`**

Add `loadApiKey();` at the end of the `renderDashboard()` function.

**Step 4: Commit**

```bash
git add public/index.html
git commit -m "feat: add API key management UI to dashboard"
```

---

### Task 6: Set up Connect IQ widget project

**Files:**
- Create: `garmin-widget/manifest.xml`
- Create: `garmin-widget/monkey.jungle`
- Create: `garmin-widget/resources/strings.xml`

**Prerequisites:** The Connect IQ SDK must be installed. Install via VS Code extension "Monkey C" or download from https://developer.garmin.com/connect-iq/sdk/

**Step 1: Create manifest.xml**

Create `garmin-widget/manifest.xml`:

```xml
<?xml version="1.0"?>
<iq:manifest xmlns:iq="http://www.garmin.com/xml/connectiq" version="3">
    <iq:application entry="StreakApp" id="a3421b-streak-widget-001"
        launcherIcon="@Drawables.LauncherIcon"
        minSdkVersion="3.1.0"
        name="@Strings.AppName"
        type="widget">
        <iq:products>
            <!-- Vivoactive series -->
            <iq:product id="vivoactive4" />
            <iq:product id="vivoactive4s" />
            <iq:product id="vivoactive5" />
            <!-- Venu series -->
            <iq:product id="venu" />
            <iq:product id="venu2" />
            <iq:product id="venu2s" />
            <iq:product id="venu3" />
            <iq:product id="venu3s" />
            <!-- Fenix series -->
            <iq:product id="fenix7" />
            <iq:product id="fenix7s" />
            <iq:product id="fenix7x" />
            <!-- Forerunner series -->
            <iq:product id="fr265" />
            <iq:product id="fr265s" />
            <iq:product id="fr965" />
        </iq:products>
        <iq:permissions>
            <iq:uses-permission id="Communications" />
        </iq:permissions>
    </iq:application>
</iq:manifest>
```

**Step 2: Create monkey.jungle**

Create `garmin-widget/monkey.jungle`:

```
project.manifest = manifest.xml
```

**Step 3: Create resources/strings.xml**

Create `garmin-widget/resources/strings.xml`:

```xml
<strings>
    <string id="AppName">Stappen Streak</string>
</strings>
```

**Step 4: Commit**

```bash
git add garmin-widget/
git commit -m "feat: scaffold Connect IQ widget project"
```

---

### Task 7: Create widget settings (for API key input)

**Files:**
- Create: `garmin-widget/resources/settings.xml`
- Create: `garmin-widget/resources/properties.xml`

**Step 1: Create properties.xml**

Create `garmin-widget/resources/properties.xml`:

```xml
<properties>
    <property id="apiKey" type="string"></property>
    <property id="apiUrl" type="string">https://your-app.vercel.app</property>
</properties>
```

**Step 2: Create settings.xml**

Create `garmin-widget/resources/settings.xml`:

```xml
<settings>
    <setting propertyKey="@Properties.apiKey" title="API Key">
        <settingConfig type="alphaNumeric" />
    </setting>
    <setting propertyKey="@Properties.apiUrl" title="Server URL">
        <settingConfig type="alphaNumeric" />
    </setting>
</settings>
```

**Step 3: Commit**

```bash
git add garmin-widget/resources/
git commit -m "feat: add widget settings for API key and URL"
```

---

### Task 8: Create the widget app entry point

**Files:**
- Create: `garmin-widget/source/StreakApp.mc`

**Step 1: Write StreakApp.mc**

```monkeyc
import Toybox.Application;
import Toybox.WatchUi;

class StreakApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new StreakView(), new StreakDelegate()];
    }
}
```

**Step 2: Commit**

```bash
git add garmin-widget/source/StreakApp.mc
git commit -m "feat: add widget app entry point"
```

---

### Task 9: Create the widget view (main rendering)

**Files:**
- Create: `garmin-widget/source/StreakView.mc`

**Step 1: Write StreakView.mc**

This is the core file — it fetches data from the API and renders to screen.

```monkeyc
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
        var streakY = h * 0.18;

        // Fire icon
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY - 5, Graphics.FONT_MEDIUM, "~", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Streak count — large
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY + 28, Graphics.FONT_NUMBER_HOT, streak.toString(), Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // "dagen" label
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2, streakY + 60, Graphics.FONT_XTINY, "dagen", Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // ── Milestone bar (middle) ──
        var barY = h * 0.58;
        var barLeft = w * 0.12;
        var barRight = w * 0.88;
        var barWidth = barRight - barLeft;

        // Background line
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(barLeft.toNumber(), barY.toNumber(), barRight.toNumber(), barY.toNumber());

        // Filled line
        var maxMs = 100;
        var fillFrac = streak.toFloat() / maxMs;
        if (fillFrac > 1.0) { fillFrac = 1.0; }
        var fillEnd = barLeft + barWidth * fillFrac;
        dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawLine(barLeft.toNumber(), barY.toNumber(), fillEnd.toNumber(), barY.toNumber());

        // Milestone dots
        for (var i = 0; i < MILESTONES.size(); i++) {
            var ms = MILESTONES[i];
            var x = barLeft + barWidth * (ms.toFloat() / maxMs);
            var achieved = (streak >= ms);

            if (achieved) {
                dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
                dc.fillCircle(x.toNumber(), barY.toNumber(), 5);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
                dc.drawCircle(x.toNumber(), barY.toNumber(), 5);
            }

            // Label below
            dc.setColor(achieved ? Graphics.COLOR_ORANGE : Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x.toNumber(), barY.toNumber() + 12, Graphics.FONT_XTINY, ms.toString(), Graphics.TEXT_JUSTIFY_CENTER);
        }

        // "Nog X dagen!" text
        if (daysToMilestone != null && daysToMilestone <= 3) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, barY.toNumber() + 26, Graphics.FONT_XTINY, "Nog " + daysToMilestone.toString() + "!", Graphics.TEXT_JUSTIFY_CENTER);
        }

        // ── Freeze shields (bottom) ──
        var shieldY = h * 0.82;

        // Draw shields
        for (var j = 0; j < 2; j++) {
            var sx = w / 2 - 20 + j * 22;
            if (freezes != null && freezes > j) {
                dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
            } else {
                dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            }
            dc.fillCircle(sx.toNumber(), shieldY.toNumber(), 6);
        }

        // Freeze count text
        var freezeText = (freezes != null ? freezes.toString() : "0") + "/2";
        dc.setColor(Graphics.COLOR_BLUE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(w / 2 + 20, shieldY.toNumber(), Graphics.FONT_XTINY, freezeText, Graphics.TEXT_JUSTIFY_LEFT | Graphics.TEXT_JUSTIFY_VCENTER);

        // ── Offline indicator ──
        if (isOffline) {
            dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(w / 2, h - 12, Graphics.FONT_XTINY, "(offline)", Graphics.TEXT_JUSTIFY_CENTER);
        }
    }
}
```

**Step 2: Commit**

```bash
git add garmin-widget/source/StreakView.mc
git commit -m "feat: add widget view with streak, milestones, and freezes rendering"
```

---

### Task 10: Create the widget delegate (input handling)

**Files:**
- Create: `garmin-widget/source/StreakDelegate.mc`

**Step 1: Write StreakDelegate.mc**

```monkeyc
import Toybox.WatchUi;

class StreakDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }
}
```

**Step 2: Commit**

```bash
git add garmin-widget/source/StreakDelegate.mc
git commit -m "feat: add widget input delegate"
```

---

### Task 11: Build and test in simulator

**Prerequisites:**
- Connect IQ SDK installed (`connectiq` CLI available)
- VS Code with Monkey C extension, OR standalone SDK tools

**Step 1: Build the widget**

```bash
cd garmin-widget
monkeyc -f monkey.jungle -d vivoactive4 -o bin/StreakWidget.prg
```

If using VS Code: Cmd+Shift+P → "Monkey C: Build Current Project"

**Step 2: Launch simulator and test**

```bash
connectiq     # starts the simulator
monkeydo bin/StreakWidget.prg vivoactive4
```

Expected: Widget shows "Stel API key in" message (since no key is configured).

**Step 3: Test with API key**

In the simulator settings, enter your API key and server URL. The widget should fetch and display streak data.

---

### Task 12: Deploy to physical watch

**Step 1: Connect watch via USB or Garmin Express**

Copy the `.prg` file to the watch:
- Connect watch to computer
- Copy `bin/StreakWidget.prg` to `GARMIN/APPS/` directory on the watch
- Eject and disconnect

**Step 2: Configure on watch**

Open Garmin Connect app on phone → Connect IQ Apps → Stappen Streak → Settings → Enter API key and server URL.

**Step 3: Verify**

Swipe to the widget on the watch. It should show streak data.

---

## Summary of files

**Backend (3 files):**
- `lib/db.js` — Modified (api_key column)
- `lib/session.js` — Modified (generateApiKey helper)
- `api/widget.js` — New (lightweight widget endpoint)
- `api/apikey.js` — New (API key management)
- `public/index.html` — Modified (API key UI section)

**Garmin Widget (7 files):**
- `garmin-widget/manifest.xml` — App metadata and device list
- `garmin-widget/monkey.jungle` — Build config
- `garmin-widget/resources/strings.xml` — App name string
- `garmin-widget/resources/properties.xml` — Default property values
- `garmin-widget/resources/settings.xml` — User-configurable settings
- `garmin-widget/source/StreakApp.mc` — App entry point
- `garmin-widget/source/StreakView.mc` — Main view (fetch + render)
- `garmin-widget/source/StreakDelegate.mc` — Input delegate
