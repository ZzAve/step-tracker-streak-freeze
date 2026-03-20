## Context

De step-tracker-streak-freeze app is een Vercel serverless webapp die stappen synct van Garmin Connect en streak/freeze logica berekent. Alle data zit in een Neon Postgres database. De huidige UI is een single-page HTML app. Er is geen manier om streak-info op het horloge zelf te bekijken.

De app gebruikt cookie-gebaseerde sessie-authenticatie (HMAC-signed cookies). Garmin Connect IQ widgets kunnen geen cookies gebruiken, dus is een alternatieve auth-methode nodig.

## Goals / Non-Goals

**Goals:**
- Streak, freezes en milestone-voortgang tonen op elk modern Garmin horloge via een widget
- Minimale server-side wijzigingen — hergebruik bestaande `calculateStreak()` logica
- Simpele setup voor de gebruiker (API key genereren in dashboard, invullen in widget settings)

**Non-Goals:**
- Publicatie op de Connect IQ Store (sideloading is voldoende voor persoonlijk gebruik)
- Interactie vanuit het horloge (geen data wijzigen, alleen lezen)
- OAuth of complexe auth flows

## Decisions

### 1. API key authenticatie i.p.v. OAuth

**Keuze:** Simpele random API key per gebruiker, als query parameter meegestuurd.

**Alternatieven:**
- OAuth 2.0: Te complex voor een personal project. Vereist token refresh flow op het horloge.
- Hardcoded user ID: Onveilig, makkelijk te raden.

**Rationale:** Een 32-byte hex key is voldoende veilig voor persoonlijk gebruik. Eenvoudig te implementeren op zowel server als horloge.

### 2. Apart `/api/widget` endpoint i.p.v. hergebruik `/api/steps`

**Keuze:** Nieuw dedicated endpoint dat alleen compacte widget-data retourneert.

**Alternatieven:**
- `/api/steps` hergebruiken met een `?format=compact` parameter: Vermengt twee auth-methoden in één endpoint.

**Rationale:** Kleinere response payload (5 velden vs. volledige step-historie). Duidelijke scheiding van concerns. Aparte auth-logica.

### 3. Connect IQ Widget (niet Watch Face of Data Field)

**Keuze:** Widget — swipe-to om streak info te bekijken.

**Rationale:** Vervangt niet de huidige watch face. Check-op-verzoek past bij hoe vaak je streak-info wilt zien. Simpelere UI dan een watch face (geen tijd/datum rendering nodig).

### 4. Sync trigger vanuit widget

**Keuze:** `/api/widget` triggert dezelfde sync-logica als `/api/steps` (met 1-uur cooldown). Sync-fouten zijn non-fatal — widget toont dan stale data.

**Rationale:** Houdt data vers zonder apart sync-mechanisme. De cooldown voorkomt overmatige Garmin API calls.

### 5. Generiek device-support via Connect IQ 3.1.0+

**Keuze:** `minSdkVersion="3.1.0"` met een lijst populaire devices (Vivoactive 4/5, Venu 1-3, Fenix 7, Forerunner 265/965).

**Rationale:** Dekt alle moderne Garmin horloges. Layout gebruikt relatieve positionering (percentages van schermgrootte) zodat het op zowel ronde als rechthoekige schermen werkt.

## Risks / Trade-offs

- **API key in query parameter** → Zichtbaar in server logs. Acceptabel voor persoonlijk gebruik; voor productie zou een header beter zijn. Mitigatie: HTTPS versleutelt de URL in transit.
- **Geen offline streak-berekening** → Widget is nutteloos zonder telefoon-verbinding. Mitigatie: Cache laatste resultaat op het horloge, toon "(offline)" indicator.
- **Connect IQ SDK vereist** → Aparte toolchain buiten het Node.js ecosysteem. Mitigatie: Widget-code is klein (~150 regels Monkey C), minimale onderhoudslast.
- **Monkey C beperkingen** → Geen emoji-support op de meeste Garmin schermen. Mitigatie: Gebruik tekst ("~" voor vuur) en geometrische vormen (cirkels voor schilden/milestones).
