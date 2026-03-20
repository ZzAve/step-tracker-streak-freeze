## ADDED Requirements

### Requirement: Gebruikers-e-mail tonen in header
Het dashboard SHALL het e-mailadres van de ingelogde gebruiker tonen in de header.

#### Scenario: E-mail zichtbaar in header
- **WHEN** de gebruiker is ingelogd en het dashboard wordt geladen
- **THEN** wordt het e-mailadres van de gebruiker getoond in de header, rechts naast de app-titel en voor de uitlogknop

#### Scenario: Lange e-mailadressen afkappen
- **WHEN** het e-mailadres langer is dan wat in de header past
- **THEN** wordt het adres afgekapt met een ellipsis (`…`)

#### Scenario: E-mail verbergen op zeer smalle schermen
- **WHEN** het scherm smaller is dan 380px
- **THEN** wordt het e-mailadres verborgen en is alleen de uitlogknop zichtbaar

### Requirement: API response bevat gebruikersinfo
Het `api/steps.js` endpoint SHALL het e-mailadres van de ingelogde gebruiker meesturen in de JSON response.

#### Scenario: E-mail in API response
- **WHEN** een ingelogde gebruiker `/api/steps` aanroept
- **THEN** bevat de JSON response een `user_email` veld met het e-mailadres van de gebruiker

### Requirement: Uitlogbevestiging
Bij klik op de uitlogknop SHALL het systeem een bevestigingsdialoog tonen voordat de gebruiker wordt uitgelogd.

#### Scenario: Bevestigingsdialoog tonen
- **WHEN** de gebruiker op de uitlogknop klikt
- **THEN** verschijnt een modale dialoog met de tekst "Weet je het zeker?" en twee knoppen: "Annuleren" en "Uitloggen"

#### Scenario: Uitloggen bevestigen
- **WHEN** de bevestigingsdialoog zichtbaar is
- **AND** de gebruiker klikt op "Uitloggen"
- **THEN** wordt de gebruiker uitgelogd en teruggestuurd naar het loginscherm

#### Scenario: Uitloggen annuleren
- **WHEN** de bevestigingsdialoog zichtbaar is
- **AND** de gebruiker klikt op "Annuleren"
- **THEN** wordt de dialoog gesloten en blijft de gebruiker op het dashboard

#### Scenario: Dialoog sluiten door buiten te klikken
- **WHEN** de bevestigingsdialoog zichtbaar is
- **AND** de gebruiker klikt op de overlay buiten de dialoog
- **THEN** wordt de dialoog gesloten
