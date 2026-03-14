## Context

De step-tracker-streak-freeze app draait op Vercel met @neondatabase/serverless voor database-connecties via HTTP. Voor lokale ontwikkeling moet dezelfde driver werken met een lokale Postgres, zonder code-wijzigingen in de API routes.

## Goals / Non-Goals

**Goals:**
- Lokale Postgres + Neon HTTP proxy via Docker Compose
- Zelfde @neondatabase/serverless driver lokaal en in productie
- Eenvoudige setup: `docker-compose up` + `vercel dev`
- `.env.example` met alle benodigde environment variables

**Non-Goals:**
- Database migratie-tooling (schema wordt via initializeDatabase() aangemaakt)
- Seed data of mock data voor Garmin API
- CI/CD integratie

## Decisions

### 1. Local Neon HTTP Proxy via Docker Compose

**Keuze**: `local-neon-http-proxy` image naast Postgres 17 in Docker Compose.

**Waarom**: Dit is de door Neon aanbevolen aanpak. De proxy vertaalt HTTP-requests van @neondatabase/serverless naar standaard Postgres wire protocol. Hierdoor hoeft de applicatiecode niet te wisselen tussen drivers.

**Alternatieven overwogen**:
- `pg` package als lokale driver: vereist een abstractielaag of driver-switch in db.js
- Neon cloud branch als dev database: vereist internetverbinding, niet offline-vriendelijk

### 2. Environment-based neonConfig in lib/db.js

**Keuze**: `NODE_ENV=development` schakelt neonConfig om naar lokale proxy endpoints.

**Waarom**: Minimale code-aanpassing. Alle API routes blijven `sql` tagged templates gebruiken zonder aanpassingen. De configuratie volgt het patroon uit de officiële Neon documentatie.

### 3. db.localtest.me voor lokale DNS

**Keuze**: Gebruik `db.localtest.me` als hostname (resolves naar 127.0.0.1 via DNS).

**Waarom**: Geen `/etc/hosts` aanpassing nodig. Voor offline gebruik kan de gebruiker `127.0.0.1 db.localtest.me` toevoegen aan `/etc/hosts`.

## Architecture

```
Docker Compose
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌────────────────┐    ┌─────────────────────┐  │
│  │  Postgres 17   │◀───│ local-neon-http-proxy│  │
│  │  :5432         │    │  :4444              │  │
│  └────────────────┘    └─────────────────────┘  │
│                               ▲                  │
└───────────────────────────────┼──────────────────┘
                                │ HTTP
                         ┌──────┴──────┐
                         │ vercel dev  │
                         │ lib/db.js   │
                         │ (neonConfig │
                         │  → local)   │
                         └─────────────┘
```

## Risks / Trade-offs

- **db.localtest.me vereist internet**: DNS lookup gaat via extern. Mitigatie: documenteer `/etc/hosts` fallback.
- **Docker vereist**: Gebruiker moet Docker geïnstalleerd hebben. Mitigatie: documenteer in README of .env.example.
- **Proxy image is community-maintained**: `ghcr.io/timowilhelm/local-neon-http-proxy` is niet officieel van Neon. Mitigatie: image is aanbevolen in Neon's eigen documentatie.
