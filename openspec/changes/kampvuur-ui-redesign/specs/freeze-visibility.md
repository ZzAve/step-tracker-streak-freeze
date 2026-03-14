# Spec: Streak Freeze Zichtbaarheid in Kalender

## Beschrijving
Dagen waarop een streak freeze is toegepast moeten visueel herkenbaar zijn in het weekoverzicht.

## Acceptatiecriteria
- [ ] Backend stuurt `freezes_used` array mee in API response
- [ ] Freeze-dagen krijgen `.freeze-used` class in de kalender
- [ ] Freeze-cel heeft ijsblauwe achtergrond (`--frost-bg`)
- [ ] Freeze-cel heeft blauwe border (`--frost`)
- [ ] Freeze-cel toont 🛡️ icoon als indicator (i.p.v. ✓ of ✗)
- [ ] Freeze-cel toont "beschermd" sublabel in klein frost-blauw tekst
- [ ] Freeze-cel heeft diagonaal frost-patroon via CSS pseudo-element
- [ ] Freeze-dag heeft voorrang op goal-met/goal-missed styling
