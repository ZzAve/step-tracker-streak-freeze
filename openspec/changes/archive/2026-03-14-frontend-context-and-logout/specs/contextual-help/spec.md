## ADDED Requirements

### Requirement: Help-knop bij elke dashboard-sectie
Het dashboard SHALL een `?` help-knop tonen bij elke card-sectie: streak/milestones (hero card), freeze-sectie, weekoverzicht, en Garmin Widget (API key).

#### Scenario: Help-knop is zichtbaar
- **WHEN** de gebruiker het dashboard bekijkt
- **THEN** is bij elke card-sectie een kleine ronde `?` knop zichtbaar in de rechterbovenhoek van de card-header

#### Scenario: Help-knop op mobiel
- **WHEN** de gebruiker het dashboard bekijkt op een scherm smaller dan 480px
- **THEN** zijn de `?` knoppen nog steeds zichtbaar en klikbaar

### Requirement: Popover met uitleg bij klik op help-knop
Bij klik op een `?` help-knop SHALL het systeem een popover-panel tonen met een korte uitleg over de betreffende sectie.

#### Scenario: Popover openen
- **WHEN** de gebruiker op een `?` knop klikt
- **THEN** verschijnt er een popover-panel direct onder de knop met een titel en uitlegtekst
- **AND** het panel heeft een fade-in animatie

#### Scenario: Popover sluiten door buiten te klikken
- **WHEN** een popover open is
- **AND** de gebruiker klikt ergens buiten het popover-panel
- **THEN** wordt het popover gesloten

#### Scenario: Popover sluiten via sluitknop
- **WHEN** een popover open is
- **AND** de gebruiker klikt op de `×` sluitknop in het popover
- **THEN** wordt het popover gesloten

#### Scenario: Slechts één popover tegelijk
- **WHEN** een popover open is
- **AND** de gebruiker klikt op een andere `?` knop
- **THEN** wordt het eerste popover gesloten en het nieuwe geopend

### Requirement: Help-teksten per sectie
Elke help-popover SHALL sectie-specifieke uitleg bevatten in het Nederlands.

#### Scenario: Streak help-tekst
- **WHEN** de gebruiker de help-knop bij de streak/hero card opent
- **THEN** bevat de uitleg informatie over wat een streak is (opeenvolgende dagen met 10.000+ stappen) en wat het record betekent

#### Scenario: Freeze help-tekst
- **WHEN** de gebruiker de help-knop bij de freeze-sectie opent
- **THEN** bevat de uitleg informatie over wat streak freezes zijn (bescherming tegen streak-verlies), het maximum (2), en hoe je nieuwe freezes verdient (elke 5 opeenvolgende goal-dagen)

#### Scenario: Weekoverzicht help-tekst
- **WHEN** de gebruiker de help-knop bij het weekoverzicht opent
- **THEN** bevat de uitleg informatie over de kleuren/iconen: groen = doel gehaald, rood = niet gehaald, blauw schild = freeze gebruikt

#### Scenario: Garmin Widget help-tekst
- **WHEN** de gebruiker de help-knop bij de Garmin Widget sectie opent
- **THEN** bevat de uitleg informatie over waarvoor de API key dient en hoe deze in de Garmin Connect IQ widget in te voeren
