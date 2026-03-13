## Why

Garmin (en andere sporthorloges) tracken dagelijkse stappen en bieden een streak-mechaniek wanneer je je stappendoel meerdere dagen achter elkaar haalt. Maar er is geen concept van een "streak freeze" — één gemiste dag na weken van consistentie reset je streak volledig naar 0. Dit is demotiverend en onnodig streng.

Een kleine webapp die je sporthorloge koppelt en een slimmere streak met freeze-mechaniek biedt lost dit op.

## What Changes

- Nieuwe webapp op Vercel met plain HTML/CSS/JS frontend
- Garmin Connect OAuth 1.0a integratie om stappen op te halen (pull-based)
- Streak-berekening met freeze-mechaniek:
  - Standaard stappendoel: 10.000
  - Elke 5 gehaalde dagen levert +1 streak freeze op (max 2 op voorraad)
  - Bij gemiste dag wordt automatisch een freeze ingezet als beschikbaar
  - Na gebruik van freeze reset de teller voor de volgende freeze naar 0
  - Geen freeze beschikbaar + dag niet gehaald = streak verloren
- Bij eerste login: historische stappen ophalen om direct een streak te tonen
- Vercel Postgres voor data-opslag (users, tokens, stappen, streaks)

## Capabilities

### New Capabilities
- `garmin-oauth`: OAuth 1.0a koppeling met Garmin Connect voor het ophalen van dagelijkse stappendata
- `streak-engine`: Berekening van streaks inclusief freeze-mechaniek (verdienen, opslaan, automatisch inzetten)
- `step-dashboard`: Eén-pagina overzicht met streak counter, freeze voorraad, en weekoverzicht van stappen

### Modified Capabilities
<!-- Geen bestaande capabilities — dit is een greenfield project -->

## Impact

- **Nieuwe dependencies**: Vercel platform, Vercel Postgres, Garmin Connect API (developer account vereist)
- **Externe API**: Garmin Connect OAuth 1.0a — vereist goedkeuring van een developer applicatie
- **Data**: Persoonlijke gezondheidsdata (stappen) wordt opgeslagen — privacy-overwegingen
- **Infrastructuur**: Vercel project met serverless functions en managed Postgres
