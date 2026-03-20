## ADDED Requirements

### Requirement: Widget API endpoint retourneert compacte streak data
Het systeem SHALL een `GET /api/widget` endpoint bieden dat compacte streak-informatie retourneert als JSON. De response bevat: `streak` (huidig), `longest`, `freezes`, `next_milestone`, `days_to_milestone`, `today_steps`, `step_goal`, en `week` (array van 7 dag-statussen).

#### Scenario: Succesvolle data-opvraag
- **WHEN** een GET request naar `/api/widget?key=<geldige-api-key>` wordt gedaan
- **THEN** retourneert het systeem HTTP 200 met JSON body `{ "streak": number, "longest": number, "freezes": number, "next_milestone": number|null, "days_to_milestone": number|null, "today_steps": number|null, "step_goal": number, "week": array }`

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

### Requirement: Widget API retourneert step_goal
Het systeem SHALL het veld `step_goal` (number) opnemen in de `/api/widget` response. Dit is het stapdoel dat de widget gebruikt voor de arc-voortgang.

#### Scenario: Step goal in response
- **WHEN** een succesvolle `/api/widget` request wordt gedaan
- **THEN** bevat de response `"step_goal": 10000`

### Requirement: Widget API retourneert wekelijkse dag-status
Het systeem SHALL het veld `week` opnemen in de `/api/widget` response als een array van 7 objecten (afgelopen 6 dagen + vandaag, chronologisch). Elk object bevat `day` (dagletter) en `status` (een van: "hit", "freeze", "not_met", "pending").

#### Scenario: Week array structuur
- **WHEN** een succesvolle `/api/widget` request wordt gedaan
- **THEN** bevat de response een `week` array met exact 7 objecten, elk met `day` (string, bijv. "M", "T", "W") en `status` (string)

#### Scenario: Dag met behaald stapdoel
- **WHEN** een dag in de afgelopen 6 dagen het stapdoel heeft behaald
- **THEN** heeft dat dag-object `status: "hit"`

#### Scenario: Dag met freeze gebruikt
- **WHEN** een dag in de afgelopen 6 dagen het stapdoel niet heeft behaald maar een freeze is toegepast
- **THEN** heeft dat dag-object `status: "freeze"`

#### Scenario: Dag zonder behaald doel en zonder freeze
- **WHEN** een dag in de afgelopen 6 dagen het stapdoel niet heeft behaald en geen freeze is toegepast
- **THEN** heeft dat dag-object `status: "not_met"`

#### Scenario: Vandaag
- **WHEN** het dag-object voor vandaag wordt gegenereerd
- **THEN** heeft dat object `status: "pending"`

#### Scenario: Dag-letters komen overeen met de dag van de week
- **WHEN** de week array wordt gegenereerd
- **THEN** komt elke `day` waarde overeen met de eerste letter van de Engelse dagnaam (M, T, W, T, F, S, S)