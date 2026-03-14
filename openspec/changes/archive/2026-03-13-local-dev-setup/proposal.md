## Why

De app kan momenteel alleen draaien met een Neon cloud database. Voor lokale ontwikkeling is het nodig om de volledige stack lokaal te kunnen draaien zonder cloud-afhankelijkheden voor de database.

## What Changes

- Docker Compose setup met Postgres 17 + local-neon-http-proxy
- Update `lib/db.js` met neonConfig voor lokale ontwikkeling
- `.env.example` met documentatie van alle environment variables
- `ws` npm dependency voor WebSocket support in Node.js

## Capabilities

### New Capabilities
- `local-dev`: Lokale ontwikkelomgeving met Docker Compose, waarmee de volledige app lokaal draait met dezelfde @neondatabase/serverless driver als in productie

### Modified Capabilities
<!-- Geen bestaande capabilities worden gewijzigd — alleen configuratie wordt aangepast -->

## Impact

- **Nieuwe dependencies**: `ws` npm package, Docker met Postgres 17 + `local-neon-http-proxy` image
- **Configuratie**: `lib/db.js` krijgt environment-aware neonConfig (development vs production)
- **Geen breaking changes**: Productie-gedrag blijft identiek, lokale config wordt alleen actief als `NODE_ENV=development`
