## Context

Greenfield project: een kleine Vercel-webapp die Garmin-stappen ophaalt en een slimmere streak met freeze-mechaniek biedt. Er is geen bestaande codebase — alles wordt from scratch gebouwd.

De gebruiker draagt een Garmin sporthorloge dat dagelijks stappen tracked. Garmin Connect biedt een OAuth 1.0a API om deze data op te halen. De webapp moet bij eerste login historische data ophalen en vervolgens bij elk bezoek de laatste stappen pullen.

## Goals / Non-Goals

**Goals:**
- Werkende Garmin OAuth 1.0a koppeling met token-opslag
- Pull-based ophalen van dagelijkse stappendata (huidige + historisch bij eerste login)
- Streak-berekening met freeze-mechaniek (verdienen per 5 dagen, max 2, auto-inzet)
- Eén-pagina dashboard met streak, freezes, en weekoverzicht
- Vercel deployment met Postgres voor persistentie

**Non-Goals:**
- Andere providers (Fitbit, Apple, Samsung) — later
- Aanpasbaar stappendoel — later (vast op 10.000)
- Push/webhook-based data sync
- User accounts met email/wachtwoord — Garmin OAuth is de enige auth
- Social features, competities, badges
- Mobile app

## Decisions

### 1. Vercel met plain HTML + serverless functions

**Keuze**: Geen frontend framework, plain HTML/CSS/JS met Vercel serverless API routes.

**Waarom**: MVP moet visueel effect bieden met minimale complexiteit. Geen build stap nodig, snelle iteratie. Vercel serverless functions handelen OAuth en API calls af.

**Alternatieven overwogen**:
- Next.js: overkill voor één pagina
- SvelteKit: leuke DX maar onnodige dependency voor MVP

### 2. Vercel Postgres voor data-opslag

**Keuze**: Vercel Postgres (managed) als primaire database.

**Waarom**: Gratis tier beschikbaar, groeit mee naar social features later, relational model past goed bij users/streaks/freezes. Vercel-native integratie maakt setup simpel.

**Alternatieven overwogen**:
- Vercel KV (Redis): simpeler maar beperkt voor relaties en queries
- SQLite: geen goede serverless story op Vercel
- Supabase: goede optie maar extra externe dependency

### 3. OAuth 1.0a via server-side flow

**Keuze**: Volledige OAuth 1.0a flow via serverless functions. Tokens opgeslagen in Postgres.

**Waarom**: Garmin gebruikt OAuth 1.0a (niet 2.0). Tokens moeten server-side blijven voor veiligheid. Session cookie koppelt browser aan gebruiker.

### 4. Pull-based data sync

**Keuze**: Stappen ophalen bij page load, niet via webhooks.

**Waarom**: Simpelste aanpak voor MVP. Geen achtergrondinfrastructuur nodig. Gebruiker ziet data alleen als ze de app openen, dus real-time sync is niet nodig.

### 5. Streak-berekening server-side

**Keuze**: Streak en freezes berekenen op de server bij data sync, resultaat opslaan in DB.

**Waarom**: Single source of truth. Voorkomt inconsistenties bij meerdere devices/browsers.

### Database schema

```
users
├── id (PK)
├── garmin_user_id (unique)
├── oauth_token
├── oauth_token_secret
├── created_at
└── last_synced_at

daily_steps
├── id (PK)
├── user_id (FK → users)
├── date (unique per user)
├── steps
└── goal_met (boolean)

streaks
├── id (PK)
├── user_id (FK → users)
├── current_streak (int)
├── longest_streak (int)
├── freeze_count (int, 0-2)
├── days_since_last_freeze_earned (int, 0-5)
└── updated_at
```

### API routes

```
GET  /api/auth/garmin       → Start OAuth 1.0a flow
GET  /api/auth/callback     → Handle OAuth callback, create session
GET  /api/steps             → Sync + return steps data en streak info
POST /api/auth/logout       → Clear session
```

## Risks / Trade-offs

- **Garmin API toegang** → Garmin developer account vereist goedkeuring. Mitigatie: vroeg aanvragen, eventueel mock-data voor ontwikkeling.
- **OAuth 1.0a complexiteit** → Ouder protocol met request signing. Mitigatie: bestaande npm libraries gebruiken (bijv. `oauth-1.0a`).
- **Rate limits Garmin API** → Pull bij elke page load kan rate limits raken. Mitigatie: cache in DB, alleen syncen als `last_synced_at` > 1 uur geleden.
- **Historische data limiet** → Garmin API kan beperkt zijn in hoeveel historische data beschikbaar is. Mitigatie: ophalen wat beschikbaar is, streak begint vanaf eerste beschikbare data.
- **Session management** → Simpele cookie-based sessions zonder framework. Mitigatie: secure, httpOnly cookies met signed tokens.
