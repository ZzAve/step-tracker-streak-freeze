## Context

De huidige dashboard (`public/index.html`) is een single-page vanilla HTML/CSS/JS app met een warm dark-mode design (amber/goud accenten, Nunito font, card-based layout). De app toont streak-data, freezes, milestones en een weekoverzicht maar geeft geen uitleg over de concepten. De header bevat alleen een titel en een uitlogknop zonder gebruikerscontext.

De backend (`api/steps.js`) retourneert streak- en stap-data maar bevat momenteel geen gebruikersinformatie in de response.

## Goals / Non-Goals

**Goals:**
- Contextinformatie toevoegen via `?` help-knoppen bij elke dashboard-sectie
- Gebruikersnaam/e-mail tonen in de header
- Uitlogbevestiging toevoegen
- Alles in vanilla HTML/CSS/JS, consistent met bestaande design-taal

**Non-Goals:**
- Geen onboarding wizard of multi-step tutorial
- Geen externe tooltip-library of framework
- Geen wijzigingen aan de login-flow zelf
- Geen i18n/meertaligheid (alles blijft Nederlands)

## Decisions

### 1. Help-tooltips: Popover pattern met CSS-only basis + minimale JS

**Keuze**: Custom popover-component met een kleine `?` cirkelknop die bij klik een floating panel toont met uitleg. Sluiten via klik buiten het panel of een `×` knop.

**Rationale**: CSS-only tooltips (`:hover`) werken slecht op mobile. Een klik-gebaseerd popover is betrouwbaarder cross-device. Native `popover` API heeft nog onvoldoende browser-support. Custom is simpeler dan een dependency toevoegen.

**Design richting** (frontend-design skill):
- De `?` knop: 20×20px cirkel, `var(--surface-alt)` achtergrond, `var(--border)` rand, `var(--text-muted)` kleur. Bij hover subtle glow met `var(--accent-glow)`.
- Het popover-panel: `var(--surface)` achtergrond, `var(--border)` rand, `var(--radius-sm)` randen, subtle `box-shadow`. Max-breedte 280px. Fade-in animatie via bestaande `fadeInUp` keyframe.
- Tekst in het panel: `0.82rem`, `var(--text)` kleur, met een vetgedrukte titel en reguliere body-tekst.
- Positie: onder de `?` knop, met een klein CSS-driehoekje (pseudo-element) als pijltje.

**Alternatieven overwogen**:
- Tooltip op hover → slecht op touch devices
- `<details>` element → styling beperkt, layout-shift
- Third-party library (Tippy.js) → overkill voor 4-5 tooltips

### 2. Gebruikerscontext: E-mail in header via bestaande API response

**Keuze**: Het `api/steps.js` endpoint uitbreiden zodat het `user_email` meestuurt in de JSON response. De frontend toont dit in de header naast de uitlogknop.

**Rationale**: Eén extra veld in een bestaand endpoint is simpeler dan een apart `/api/me` endpoint. De sessie bevat al de gebruikers-ID waarmee het e-mail opgehaald kan worden.

**Design richting**:
- Header layout: flex met `gap`, titel links, rechts een cluster van e-mail (truncated, `var(--text-muted)`, `0.8rem`) + uitlogknop.
- Op smalle schermen (<380px): e-mail verbergen, alleen uitlogknop tonen.

### 3. Uitlogbevestiging: Custom modal in bestaande stijl

**Keuze**: Lichtgewicht custom modal (overlay + centered card) met "Weet je het zeker?" tekst en twee knoppen (Annuleren / Uitloggen).

**Rationale**: `window.confirm()` werkt maar is lelijk en niet-stijlbaar. Een custom modal past beter bij het design. Geen externe dependency nodig.

**Design richting**:
- Overlay: `rgba(0,0,0,0.6)` met backdrop-blur.
- Modal-card: hergebruikt `.card` stijl, centered via flex, max-width 320px.
- Primaire actie (Uitloggen) in `var(--red)`, secundaire (Annuleren) in `var(--surface-alt)`.

## Risks / Trade-offs

- **[Popover z-index conflicten]** → Mitigatie: hoge z-index (999) en test op alle secties.
- **[E-mail ophalen kost extra DB query]** → Mitigatie: minimale overhead, één query per page load, al in de sessie-context.
- **[Popover positionering op kleine schermen]** → Mitigatie: max-width + centered fallback als er niet genoeg ruimte is.
