## Why

Er is geen manier om streak-informatie direct op het Garmin horloge te bekijken. De gebruiker moet de web-app openen om hun huidige streak, freezes en milestone-voortgang te zien. Een Connect IQ widget maakt deze data met één swipe beschikbaar op het horloge.

## What Changes

- **Nieuw `/api/widget` endpoint** — Lichtgewicht API die alleen widget-relevante data retourneert (streak, freezes, volgende milestone), geauthenticeerd via API key
- **API key systeem** — `api_key` kolom op users tabel + `/api/apikey` endpoint om keys te genereren/bekijken
- **API key UI in dashboard** — Sectie in de web-app om de API key te genereren en te kopiëren
- **Connect IQ Widget** — Monkey C widget-project dat streak, milestone-voortgang en freeze-schilden toont op het Garmin horloge

## Capabilities

### New Capabilities
- `widget-api`: Lichtgewicht API endpoint (`/api/widget`) met API key authenticatie voor het ophalen van compacte streak data
- `api-key-management`: API key generatie, opslag en beheer (database kolom, endpoints, dashboard UI)
- `connect-iq-widget`: Garmin Connect IQ widget in Monkey C die streak data ophaalt en rendert op het horloge

### Modified Capabilities

## Impact

- **Database**: Nieuwe `api_key` kolom op `users` tabel (migratie nodig)
- **Backend**: Twee nieuwe Vercel serverless endpoints (`api/widget.js`, `api/apikey.js`)
- **Frontend**: Nieuwe sectie in `public/index.html` voor API key management
- **Nieuw project**: `garmin-widget/` directory met Connect IQ Monkey C code
- **Dependencies**: Connect IQ SDK nodig voor bouwen/deployen van de widget (niet een npm dependency)
