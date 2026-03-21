## MODIFIED Requirements

### Requirement: Widget haalt data op bij weergave
De widget SHALL data ophalen van `/api/widget`. Bij het openen (`onShow`) SHALL de widget eerst gecachte data laden uit `Application.Storage`. Als de cache aanwezig is, SHALL de widget de gecachte data tonen zonder te wachten op een HTTP-respons. Als de cache ouder is dan 30 minuten of niet aanwezig is, SHALL de widget een HTTP-fetch starten (op de achtergrond als er gecachte data beschikbaar is, of als primaire fetch als er geen cache is).

#### Scenario: Succesvol ophalen met lege cache
- **WHEN** de gebruiker naar de widget swipet en er is geen cache en er is een internetverbinding
- **THEN** haalt de widget verse data op, rendert het scherm, en slaat de data op in de cache

#### Scenario: Gecachte data is vers (< 30 minuten)
- **WHEN** de gebruiker naar de widget swipet en de cache is jonger dan 30 minuten
- **THEN** toont de widget direct de gecachte data zonder een HTTP-fetch te starten

#### Scenario: Gecachte data is verlopen (≥ 30 minuten)
- **WHEN** de gebruiker naar de widget swipet en de cache is 30 minuten of ouder
- **THEN** toont de widget direct de gecachte data EN start een achtergrond HTTP-fetch, met een refresh indicator

#### Scenario: Offline met gecachte data
- **WHEN** de gebruiker naar de widget swipet, er is geen internetverbinding, maar er is eerder data opgehaald
- **THEN** toont de widget de gecachte data met een "offline" indicator

#### Scenario: Data is meer dan 3 uur oud (zeer verlopen cache)
- **WHEN** de HTTP-fetch mislukt EN de `cacheTimestamp` is meer dan 10800 seconden geleden (of afwezig)
- **THEN** wordt `isOffline` op `true` gezet, ongeacht of er streakdata aanwezig is

#### Scenario: Offline zonder gecachte data
- **WHEN** de widget voor het eerst wordt geopend zonder internetverbinding
- **THEN** toont de widget "Laden..." en vervolgens een foutmelding of leeg scherm
