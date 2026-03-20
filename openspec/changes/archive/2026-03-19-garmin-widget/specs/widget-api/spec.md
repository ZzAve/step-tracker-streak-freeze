## ADDED Requirements

### Requirement: Widget API endpoint retourneert compacte streak data
Het systeem SHALL een `GET /api/widget` endpoint bieden dat compacte streak-informatie retourneert als JSON. De response bevat: `streak` (huidig), `longest`, `freezes`, `next_milestone`, en `days_to_milestone`.

#### Scenario: Succesvolle data-opvraag
- **WHEN** een GET request naar `/api/widget?key=<geldige-api-key>` wordt gedaan
- **THEN** retourneert het systeem HTTP 200 met JSON body `{ "streak": number, "longest": number, "freezes": number, "next_milestone": number|null, "days_to_milestone": number|null }`

#### Scenario: Milestone berekening wanneer streak onder een milestone zit
- **WHEN** de huidige streak 8 is
- **THEN** is `next_milestone` 10 en `days_to_milestone` 2

#### Scenario: Alle milestones behaald
- **WHEN** de huidige streak 100 of hoger is
- **THEN** is `next_milestone` null en `days_to_milestone` null

### Requirement: Widget API triggert data sync
Het systeem SHALL bij een widget-request dezelfde Garmin sync-logica uitvoeren als `/api/steps`, met een cooldown van 1 uur. Sync-fouten zijn non-fatal.

#### Scenario: Sync wordt getriggerd na cooldown
- **WHEN** de laatste sync meer dan 1 uur geleden is
- **THEN** synct het systeem nieuwe stappen van Garmin voordat het de response stuurt

#### Scenario: Sync-fout retourneert stale data
- **WHEN** de Garmin sync faalt
- **THEN** retourneert het systeem HTTP 200 met de laatst bekende streak data (geen 500 error)

### Requirement: Widget API vereist geldige API key
Het systeem SHALL requests zonder of met ongeldige API key afwijzen.

#### Scenario: Ontbrekende API key
- **WHEN** een GET request naar `/api/widget` wordt gedaan zonder `key` parameter
- **THEN** retourneert het systeem HTTP 401 met `{ "error": "Missing API key" }`

#### Scenario: Ongeldige API key
- **WHEN** een GET request met een niet-bestaande API key wordt gedaan
- **THEN** retourneert het systeem HTTP 401 met `{ "error": "Invalid API key" }`
