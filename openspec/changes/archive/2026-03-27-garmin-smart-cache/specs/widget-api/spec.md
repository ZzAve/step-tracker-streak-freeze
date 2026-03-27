## MODIFIED Requirements

### Requirement: Widget API endpoint retourneert compacte streak data
Het systeem SHALL een `GET /api/widget` endpoint bieden dat compacte streak-informatie retourneert als JSON. De response bevat: `streak` (huidig), `longest`, `freezes`, `next_milestone`, `days_to_milestone`, `today_steps`, `step_goal`, `week` (array van 7 dag-statussen), `lastUpdatedAt` (Number, epoch seconds van laatste sync), en `refreshAfter` (Number, epoch seconds waarna de widget opnieuw mag fetchen).

#### Scenario: Succesvolle data-opvraag
- **WHEN** een GET request naar `/api/widget?key=<geldige-api-key>` wordt gedaan
- **THEN** retourneert het systeem HTTP 200 met JSON body `{ "streak": number, "longest": number, "freezes": number, "next_milestone": number|null, "days_to_milestone": number|null, "today_steps": number|null, "step_goal": number, "week": array, "lastUpdatedAt": number, "refreshAfter": number }`

#### Scenario: Milestone berekening wanneer streak onder een milestone zit
- **WHEN** de huidige streak 8 is
- **THEN** is `next_milestone` 10 en `days_to_milestone` 2

#### Scenario: Alle milestones behaald
- **WHEN** de huidige streak 100 of hoger is
- **THEN** is `next_milestone` null en `days_to_milestone` null