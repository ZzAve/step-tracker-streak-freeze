# Kampvuur UI Redesign

## Samenvatting

Herontwerp van het Stappen Streak dashboard met een warm "kampvuur" thema. De huidige koude navy/indigo UI wordt getransformeerd naar een gezellige, warme dark-mode ervaring met amber/goud accenten. Daarnaast worden streak freezes zichtbaar in de kalender en komen er progressieve streak milestone-indicatoren.

## Motivatie

- De huidige UI voelt koud en technisch — niet uitnodigend voor dagelijks gebruik
- Streak freeze dagen zijn onzichtbaar in het weekoverzicht
- Er is geen visueel gevoel van progressie/beloning bij langere streaks

## Scope

### In scope
1. **Warm kleurenpalet** — van koud navy naar warm donkerbruin/amber tonen
2. **Typografie** — van system fonts naar Nunito (rond, friendly)
3. **Streak freeze zichtbaarheid** — freeze-dagen in kalender met 🛡️ icoon, frost-patroon, en "beschermd" label
4. **Progressieve streak milestones** — "vlammenpad" met milestones op 5, 10, 25, 50, 100 dagen
5. **Layout herstructurering** — hero-sectie (streak + milestones + freezes) bovenaan, kalender eronder
6. **Animaties** — count-up voor streak getal, staggered milestone verschijning bij laden
7. **Sfeer-details** — radial gradient achtergrond, glow shadows op kaarten, hover effecten

### Buiten scope
- Backend wijzigingen (behalve het doorgeven van `freezes_used` aan de frontend)
- Login scherm redesign (kan later)
- Nieuwe functionaliteit (alleen visueel)

## Metafoor

Het kampvuur: je streak is een vuur dat je brandend houdt. Elke dag dat je je doel haalt, voeg je brandstof toe. Freezes zijn schilden die je vuur beschermen als je een dag mist. Milestones markeren hoe lang je vuur al brandt.

## Technische aanpak

- Alles in `public/index.html` (bestaande architectuur behouden)
- Google Fonts link voor Nunito
- CSS custom properties updaten naar warm palet
- Backend: `freezes_used` array toevoegen aan API response
- Frontend: freeze-dagen herkennen en apart stylen in weekoverzicht
