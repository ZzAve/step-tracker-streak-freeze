## ADDED Requirements

### Requirement: Widget toont streak informatie
De Connect IQ widget SHALL de huidige streak-telling prominent tonen op het scherm, samen met een vuursymbool.

#### Scenario: Streak data beschikbaar
- **WHEN** de widget streak data heeft opgehaald
- **THEN** toont het scherm de streak-telling (groot getal), het woord "dagen", en een vuursymbool

### Requirement: Widget toont milestone-voortgang
De widget SHALL een horizontale voortgangsbalk tonen met milestone markers op 5, 10, 25, 50 en 100 dagen.

#### Scenario: Milestones deels behaald
- **WHEN** de huidige streak 23 is
- **THEN** zijn de markers voor 5 en 10 gevuld (amber), de lijn tot 23% gevuld, en markers voor 25, 50, 100 als outline

#### Scenario: Bijna bij volgende milestone
- **WHEN** de streak minder dan 3 dagen van de volgende milestone is
- **THEN** toont de widget "Nog X!" tekst onder de milestone balk

### Requirement: Widget toont freeze schilden
De widget SHALL de huidige freeze-status tonen als twee cirkel-indicatoren met een count.

#### Scenario: Twee freezes beschikbaar
- **WHEN** `freezes` is 2
- **THEN** zijn beide cirkels gevuld (blauw) en toont de tekst "2/2"

#### Scenario: Geen freezes beschikbaar
- **WHEN** `freezes` is 0
- **THEN** zijn beide cirkels grijs en toont de tekst "0/2"

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
