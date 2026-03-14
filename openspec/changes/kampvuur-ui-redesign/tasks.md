# Tasks: Kampvuur UI Redesign

## 1. Backend: freezes_used doorgeven aan frontend
- [x] In `lib/streak.js`: zorg dat `freezes_used` (array van datumstrings) beschikbaar is in het return object van `calculateStreak()`
- [x] In `api/steps.js`: voeg `freezes_used` toe aan de streak data in de API response

## 2. Kleurenpalet & typografie
- [x] Voeg Google Fonts link toe voor Nunito in de `<head>`
- [x] Update alle CSS custom properties naar het warme palet (zie design.md)
- [x] Update `body` font-family naar Nunito
- [x] Update streak-number gradient naar wit → amber
- [x] Voeg radial gradient toe aan body background (warme vignette)
- [x] Verhoog border-radius naar 14px/10px

## 3. Layout herstructurering
- [x] Maak hero card die streak getal, langste streak, vlammenpad en freeze-status combineert
- [x] Update app titel icoon van 🏃 naar 🔥
- [x] Voeg amber glow box-shadow toe aan hero card
- [x] Pas kaart styling aan (zachte glow i.p.v. harde borders)

## 4. Vlammenpad (milestone tracker)
- [x] Bouw milestone tracker component met markers op 5, 10, 25, 50, 100
- [x] Style behaalde milestones (amber, 🔥) en toekomstige (dim, outline)
- [x] Toon huidige positie marker op de lijn
- [x] Toon "Nog X dagen!" als streak < 3 dagen van volgende milestone
- [x] Responsive: verberg labels op < 480px

## 5. Freeze-dagen in kalender
- [x] Detecteer freeze-dagen in `renderWeek()` via `freezes_used` data
- [x] Voeg `.freeze-used` class toe met ijsblauwe achtergrond en border
- [x] Toon 🛡️ icoon en "beschermd" sublabel in freeze-cellen
- [x] Voeg diagonaal frost-patroon toe via CSS pseudo-element

## 6. Freeze card updaten
- [x] Vervang ❄️ sneeuwvlokken door 🛡️ schilden
- [x] Pas freeze card aan naar compacte rij in de hero card

## 7. Animaties
- [x] Count-up animatie voor streak getal (0 → waarde, ~800ms)
- [x] Staggered fade-in voor milestone markers (100ms delay)
- [x] Fade-in + translateY voor kaarten bij laden
- [x] Hover effect op dag-cellen (amber glow + scale)
- [x] Pulse animatie op behaalde milestone markers

## 8. Responsive afwerking
- [x] Test en fix layout op < 480px
- [x] Test en fix layout op < 380px (kleinere streak font)
