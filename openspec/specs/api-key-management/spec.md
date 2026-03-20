## ADDED Requirements

### Requirement: Gebruikers kunnen een API key genereren
Het systeem SHALL ingelogde gebruikers toestaan om een unieke API key te genereren via `POST /api/apikey`. De key is een 64-karakter hex string (32 bytes random).

#### Scenario: Nieuwe key genereren
- **WHEN** een ingelogde gebruiker een POST request naar `/api/apikey` doet
- **THEN** genereert het systeem een nieuwe API key, slaat deze op in de database, en retourneert `{ "api_key": "<64-char-hex>" }`

#### Scenario: Bestaande key vervangen
- **WHEN** een gebruiker die al een API key heeft een POST request naar `/api/apikey` doet
- **THEN** wordt de oude key vervangen door een nieuwe (de oude key werkt niet meer)

#### Scenario: Niet-ingelogde gebruiker
- **WHEN** een niet-geauthenticeerde gebruiker een POST request naar `/api/apikey` doet
- **THEN** retourneert het systeem HTTP 401

### Requirement: Gebruikers kunnen hun huidige API key opvragen
Het systeem SHALL ingelogde gebruikers toestaan om hun huidige API key op te vragen via `GET /api/apikey`.

#### Scenario: Key opvragen met bestaande key
- **WHEN** een ingelogde gebruiker met een API key een GET request naar `/api/apikey` doet
- **THEN** retourneert het systeem `{ "api_key": "<huidige-key>" }`

#### Scenario: Key opvragen zonder bestaande key
- **WHEN** een ingelogde gebruiker zonder API key een GET request naar `/api/apikey` doet
- **THEN** retourneert het systeem `{ "api_key": null }`

### Requirement: API key opslag in database
Het systeem SHALL een `api_key` kolom (VARCHAR(64), UNIQUE) op de `users` tabel ondersteunen. De kolom is nullable (niet elke gebruiker heeft een key).

#### Scenario: Database migratie
- **WHEN** de applicatie start met een bestaande database zonder `api_key` kolom
- **THEN** wordt de kolom automatisch toegevoegd via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`

### Requirement: Dashboard toont API key beheer
De web-app SHALL een sectie in het dashboard tonen waar de gebruiker hun API key kan genereren en bekijken.

#### Scenario: Geen bestaande key
- **WHEN** de gebruiker het dashboard opent en geen API key heeft
- **THEN** toont het dashboard een "Genereer API Key" knop

#### Scenario: Bestaande key tonen
- **WHEN** de gebruiker het dashboard opent en een API key heeft
- **THEN** toont het dashboard de volledige key en een "Nieuwe Key Genereren" knop
