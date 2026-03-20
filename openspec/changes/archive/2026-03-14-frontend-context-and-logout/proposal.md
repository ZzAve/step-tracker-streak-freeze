## Why

De huidige dashboard-UI toont data (streak, freezes, milestones, weekoverzicht) maar geeft geen uitleg over wat de concepten betekenen. Nieuwe gebruikers moeten zelf uitzoeken wat een streak freeze is, hoe milestones werken, of wat het stappendoel is. Daarnaast is de uitlogknop aanwezig maar mist er verdere account-context (wie ben ik ingelogd als?). Door contextinformatie toe te voegen via **? help-knoppen** en een duidelijkere header met gebruikersinfo + uitlog, wordt de app toegankelijker en begrijpelijker.

## What Changes

- **Help-tooltips toevoegen**: Bij elke card/sectie (streak, freezes, milestones, weekoverzicht, API key) een `?`-knop die een korte uitleg toont over wat die sectie betekent en hoe het werkt.
- **Gebruikerscontext in header**: Toon de ingelogde gebruikersnaam/e-mail in de header naast de uitlogknop, zodat duidelijk is welk account actief is.
- **Verbeterde uitlogflow**: Bevestigingsdialoog bij uitloggen om per ongeluk uitloggen te voorkomen.
- **Onboarding hints**: Bij eerste gebruik (of lege streak) een welkomstbericht met korte uitleg van de kernconcepten.

## Capabilities

### New Capabilities
- `contextual-help`: In-app help-tooltips (? knoppen) bij dashboard-secties die uitleg geven over streak, freezes, milestones en weekoverzicht.
- `user-context-header`: Toon gebruikersinfo in de dashboard header en verbeterde uitlogflow met bevestiging.

### Modified Capabilities

_(geen bestaande spec-wijzigingen nodig)_

## Impact

- `public/index.html` — HTML structuur, CSS en JavaScript uitbreiden
- `api/steps.js` — mogelijk gebruikersnaam/e-mail meesturen in response (of apart endpoint)
- Geen nieuwe dependencies, alles in vanilla HTML/CSS/JS
