## 1. Backend: Gebruikersinfo in API response

- [x] 1.1 `api/steps.js` uitbreiden: `user_email` veld toevoegen aan de JSON response door e-mail op te halen uit de sessie/database

## 2. CSS: Help-popover en modal stijlen

- [x] 2.1 CSS toevoegen voor `?` help-knop (`.help-btn`): 20×20px cirkel, muted styling, hover-glow
- [x] 2.2 CSS toevoegen voor popover-panel (`.help-popover`): floating panel met pijltje, fade-in animatie, max-width 280px
- [x] 2.3 CSS toevoegen voor uitlog-bevestigingsmodal (`.modal-overlay`, `.modal-card`): overlay met backdrop-blur, centered card

## 3. HTML: Help-knoppen en modal structuur

- [x] 3.1 `?` help-knoppen toevoegen bij hero card, freeze-sectie, weekoverzicht-card en Garmin Widget-card
- [x] 3.2 Uitlog-bevestigingsmodal HTML toevoegen (overlay + card met "Weet je het zeker?", Annuleren en Uitloggen knoppen)
- [x] 3.3 Header aanpassen: gebruikers-e-mail element toevoegen tussen titel en uitlogknop

## 4. JavaScript: Help-popover logica

- [x] 4.1 Popover open/sluit logica implementeren: klik op `?` opent popover, klik buiten of op `×` sluit, maximaal één tegelijk open
- [x] 4.2 Help-teksten definiëren per sectie (streak, freeze, weekoverzicht, Garmin Widget) in het Nederlands

## 5. JavaScript: Gebruikerscontext en uitlogbevestiging

- [x] 5.1 Gebruikers-e-mail uit API response tonen in header (met ellipsis-truncatie)
- [x] 5.2 Uitlogknop koppelen aan bevestigingsmodal in plaats van directe logout
- [x] 5.3 Modal-logica: Annuleren sluit modal, Uitloggen voert logout uit, klik op overlay sluit modal

## 6. Responsive aanpassingen

- [x] 6.1 E-mail verbergen op schermen <380px
- [x] 6.2 Help-popovers testen en positionering aanpassen voor mobiel (centered fallback bij te weinig ruimte)
