# Tasks: Garmin Streak Widget

## 1. Database: API key kolom

- [x] 1.1 Voeg `api_key VARCHAR(64) UNIQUE` kolom toe aan users CREATE TABLE in `lib/db.js`
- [x] 1.2 Voeg `ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(64) UNIQUE` migratie toe aan `initializeDatabase()`

## 2. API key management

- [x] 2.1 Voeg `generateApiKey()` functie toe aan `lib/session.js` (32 bytes random → 64-char hex)
- [x] 2.2 Maak `api/apikey.js` endpoint (GET: huidige key ophalen, POST: nieuwe key genereren)

## 3. Widget API endpoint

- [x] 3.1 Maak `api/widget.js` met API key authenticatie via `?key=` query parameter
- [x] 3.2 Implementeer Garmin sync-logica (hergebruik patroon uit `api/steps.js`, sync-fouten non-fatal)
- [x] 3.3 Bereken milestone info (next_milestone, days_to_milestone) op basis van `calculateStreak()` resultaat
- [x] 3.4 Retourneer compacte JSON response: `{ streak, longest, freezes, next_milestone, days_to_milestone }`

## 4. Dashboard API key UI

- [x] 4.1 Voeg "Garmin Widget" card sectie toe aan `public/index.html` met API key display en genereer-knop
- [x] 4.2 Voeg JavaScript toe voor key genereren (POST `/api/apikey`) en laden (GET `/api/apikey`)
- [x] 4.3 Roep `loadApiKey()` aan in `renderDashboard()`

## 5. Connect IQ project scaffolding

- [x] 5.1 Maak `garmin-widget/manifest.xml` met widget type, device lijst, en Communications permissie
- [x] 5.2 Maak `garmin-widget/monkey.jungle` build configuratie
- [x] 5.3 Maak `garmin-widget/resources/strings.xml` met app naam
- [x] 5.4 Maak `garmin-widget/resources/properties.xml` met `apiKey` en `apiUrl` properties
- [x] 5.5 Maak `garmin-widget/resources/settings.xml` met configureerbare settings

## 6. Connect IQ widget code

- [x] 6.1 Maak `garmin-widget/source/StreakApp.mc` app entry point
- [x] 6.2 Maak `garmin-widget/source/StreakDelegate.mc` input delegate
- [x] 6.3 Maak `garmin-widget/source/StreakView.mc` met API fetch (`Communications.makeWebRequest`)
- [x] 6.4 Implementeer `onUpdate()` rendering: streak getal, milestone balk, freeze schilden
- [x] 6.5 Implementeer offline caching en "(offline)" indicator
- [x] 6.6 Implementeer "Stel API key in" scherm wanneer geen key geconfigureerd is

## 7. Bouwen en testen

- [ ] 7.1 Bouw widget met Connect IQ SDK en test in simulator
- [ ] 7.2 Deploy `.prg` bestand naar fysiek Garmin horloge en verifieer werking
