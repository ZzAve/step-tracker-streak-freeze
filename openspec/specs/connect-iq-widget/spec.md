## ADDED Requirements

### Requirement: Widget toont streak informatie
De Connect IQ widget SHALL de huidige streak-telling prominent tonen als groot gecentreerd getal (hero number) op het scherm. Boven het getal toont de widget een schoen-icoon (bitmap). Rond het getal toont de widget een cirkelvormige arc die de voortgang van vandaag's stappen richting het stapdoel visualiseert.

#### Scenario: Streak data beschikbaar
- **WHEN** de widget streak data heeft opgehaald
- **THEN** toont het scherm het schoen-icoon (bitmap) bovenaan, een oranje cirkelvormige arc (gevuld op basis van vandaag's stappen / stapdoel), en de streak-telling als groot gecentreerd wit getal

#### Scenario: Arc toont real-time stappen
- **WHEN** de widget actief is en ActivityMonitor beschikbaar is
- **THEN** gebruikt de arc de lokale ActivityMonitor stappen voor real-time voortgang, met fallback naar API `today_steps`

#### Scenario: Stapdoel bereikt
- **WHEN** vandaag's stappen >= `step_goal`
- **THEN** is de arc volledig gevuld

### Requirement: Widget toont milestone-voortgang
De widget SHALL milestone-informatie tonen op een tweede scherm (detail screen), NIET op het hoofdscherm. Het hoofdscherm toont geen milestone-voortgangsbalk meer.

#### Scenario: Tweede scherm toont milestone info
- **WHEN** de gebruiker op het tweede scherm is
- **THEN** toont het scherm "Volgende" met het volgende milestone getal en "dagen", gevolgd door "nog X te gaan", een scheidingslijn, en "Langste" met het langste streak getal en "dagen"

#### Scenario: Tweede scherm visuele stijl
- **WHEN** het tweede scherm wordt getoond
- **THEN** heeft het scherm een lichte/witte achtergrond met donkere tekst, conform native Garmin detail-schermen

#### Scenario: Alle milestones behaald
- **WHEN** `next_milestone` null is
- **THEN** toont het tweede scherm alleen de langste streak informatie

### Requirement: Widget toont freeze indicatoren
De widget SHALL beschikbare freezes tonen als gecentreerde sneeuwvlok-symbolen (❄) onder het streak-getal op het hoofdscherm. Alleen beschikbare freezes worden getoond, zonder grijze placeholders.

#### Scenario: Twee freezes beschikbaar
- **WHEN** `freezes` is 2
- **THEN** toont de widget twee sneeuwvlok-symbolen gecentreerd onder het streak-getal: ❄ ❄

#### Scenario: Eén freeze beschikbaar
- **WHEN** `freezes` is 1
- **THEN** toont de widget één gecentreerd sneeuwvlok-symbool: ❄

#### Scenario: Geen freezes beschikbaar
- **WHEN** `freezes` is 0
- **THEN** toont de widget geen sneeuwvlok-symbolen

### Requirement: Widget haalt data op bij weergave
De widget SHALL data ophalen van `/api/widget` elke keer dat de gebruiker naar de widget swipet (`onShow`).

#### Scenario: Succesvol ophalen
- **WHEN** de gebruiker naar de widget swipet en er is een internetverbinding
- **THEN** haalt de widget verse data op en rendert het scherm

#### Scenario: Offline met gecachte data
- **WHEN** de gebruiker naar de widget swipet, er is geen internetverbinding, maar er is eerder data opgehaald
- **THEN** toont de widget de gecachte data met een "(offline)" indicator

#### Scenario: Offline zonder gecachte data
- **WHEN** de widget voor het eerst wordt geopend zonder internetverbinding
- **THEN** toont de widget "Laden..." of een foutmelding

### Requirement: Widget toont wekelijkse status rij
De widget SHALL onderaan het hoofdscherm een rij van 7 posities tonen: de afgelopen 6 dagen + vandaag. Elke positie toont de status van die dag.

#### Scenario: Dag met behaald stapdoel
- **WHEN** een dag de status "hit" heeft
- **THEN** toont die positie een vinkje (✓) in groen

#### Scenario: Dag met gebruikte freeze
- **WHEN** een dag de status "freeze" heeft
- **THEN** toont die positie een sneeuwvlok (❄) in blauw

#### Scenario: Dag zonder behaald doel
- **WHEN** een dag de status "not_met" heeft
- **THEN** toont die positie de dagletter (M, T, W, etc.) in grijs

#### Scenario: Vandaag nog niet bepaald
- **WHEN** vandaag de status "pending" heeft en stappen < stapdoel
- **THEN** toont die positie de dagletter in grijs

#### Scenario: Vandaag real-time update
- **WHEN** vandaag de status "pending" heeft maar ActivityMonitor stappen >= stapdoel
- **THEN** toont die positie een vinkje (✓) in groen (real-time update)

### Requirement: Widget ondersteunt twee schermen met navigatie
De widget SHALL twee schermen ondersteunen: een hoofdscherm (glance) en een detailscherm (milestone info). De gebruiker navigeert tussen schermen door te drukken/tikken.

#### Scenario: Navigatie naar detail scherm
- **WHEN** de gebruiker op het hoofdscherm drukt/tikt (onSelect)
- **THEN** schakelt de widget naar het detailscherm

#### Scenario: Navigatie terug naar hoofdscherm
- **WHEN** de gebruiker op het detailscherm drukt/tikt (onSelect)
- **THEN** schakelt de widget terug naar het hoofdscherm

### Requirement: Widget is configureerbaar via Connect IQ instellingen
De widget SHALL twee instelbare properties hebben: `apiKey` (API key) en `apiUrl` (server URL).

#### Scenario: Geen API key geconfigureerd
- **WHEN** de widget wordt geopend zonder geconfigureerde API key
- **THEN** toont de widget "Stel API key in" met instructie "via Connect IQ app"

#### Scenario: API key en URL geconfigureerd
- **WHEN** de gebruiker de API key en URL heeft ingesteld via de Garmin Connect app
- **THEN** gebruikt de widget deze waarden om data op te halen

### Requirement: Widget ondersteunt meerdere Garmin devices
De widget SHALL compatibel zijn met Connect IQ 3.1.0+ en ondersteuning bieden voor populaire Garmin horloges (Vivoactive 4/5, Venu 1-3, Fenix 7, Forerunner 265/965). De layout past zich aan aan de schermgrootte.

#### Scenario: Rond scherm (bijv. Vivoactive 4)
- **WHEN** de widget draait op een horloge met rond scherm
- **THEN** is de layout gecentreerd en proportioneel aan de schermgrootte

#### Scenario: Ander schermformaat
- **WHEN** de widget draait op een horloge met een ander schermformaat
- **THEN** past de layout zich aan via relatieve positionering (percentages)
