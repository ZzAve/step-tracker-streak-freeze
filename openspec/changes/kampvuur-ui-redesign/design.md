# Design: Kampvuur UI Redesign

## Kleurenpalet

```css
:root {
  /* Warm dark mode basis */
  --bg: #12100e;              /* warm zwart */
  --surface: #1e1a16;         /* donker hout */
  --surface-alt: #28231c;     /* lichtere hout tint */
  --border: #3a3028;          /* warm grijs */

  /* Tekst */
  --text: #f0e6d6;            /* creme wit */
  --text-muted: #9a8b78;      /* warm grijs */

  /* Accent — amber/goud */
  --accent: #e8a44a;          /* amber */
  --accent-hover: #f0b866;    /* lichter amber */
  --accent-glow: rgba(232, 164, 74, 0.15); /* voor shadows */

  /* Status kleuren — warmer */
  --green: #7bc67e;           /* warmer groen */
  --green-bg: #1a2e1a;        /* donker groen achtergrond */
  --red: #d4736c;             /* zachter rood */
  --red-bg: #2e1a1a;          /* donker rood achtergrond */

  /* Freeze/schild kleuren */
  --frost: #64b5f6;           /* ijs blauw */
  --frost-bg: #162a3a;        /* ijs achtergrond */

  /* Specials */
  --gold: #ffc107;            /* record/trofee */

  /* Spacing */
  --radius: 14px;             /* iets ronder */
  --radius-sm: 10px;
}
```

## Typografie

- **Font**: Nunito (Google Fonts) — rond, warm, friendly
- **Fallback**: system-ui, sans-serif
- **Streak getal**: Nunito 800, gradient `linear-gradient(135deg, #fff 30%, var(--accent))`
- **Labels**: Nunito 700, uppercase, letter-spacing 0.08em
- **Body**: Nunito 400-600

## Layout structuur

```
┌─────────────────────────────────────────────────┐
│  🔥 Stappen Streak                      [Uit]  │
│                                                 │
│  ╭── Hero Card ─────────────────────────────╮   │
│  │                                          │   │
│  │   [streak getal]     [langste streak]    │   │
│  │      🔥 23              🏆 31            │   │
│  │     dagen              record            │   │
│  │                                          │   │
│  │   [vlammenpad / milestones]              │   │
│  │   5🔥━━10🔥━━━25🔥╌╌╌╌50╌╌╌╌100         │   │
│  │              ▲ Nog 2 dagen!              │   │
│  │                                          │   │
│  │   [schilden]                             │   │
│  │   🛡️● 🛡️●  2 schilden beschikbaar       │   │
│  │   Maximum bereikt                        │   │
│  │                                          │   │
│  ╰──────────────────────────────────────────╯   │
│                                                 │
│  ╭── Week Card ─────────────────────────────╮   │
│  │  ‹  10 – 16 mrt 2026  ›                 │   │
│  │                                          │   │
│  │  [7-dag grid]                            │   │
│  │  Ma  Di  Wo  Do   Vr   Za  Zo           │   │
│  │  ✓   ✗   ✓   🛡️   ✓    ✓   —            │   │
│  ╰──────────────────────────────────────────╯   │
│                                                 │
│        Laatste sync: 14 mrt 09:32               │
└─────────────────────────────────────────────────┘
```

### Hero Card

De hero combineert drie elementen die nu aparte kaarten zijn:

1. **Streak getal** (links/midden) — groot, amber gradient, 🔥 icoon erboven
2. **Vlammenpad** (midden) — horizontale progressiebalk met milestone markers
3. **Schilden** (onder) — freeze status in compacte rij

De hero card krijgt een subtiele `box-shadow` met amber glow en een lichte radiale gradient in de achtergrond (warm center glow).

### Week Card

Blijft grotendeels hetzelfde maar met:
- Warmere kleuren
- Freeze-dagen met apart styling
- Rondere hoeken
- Hover effect op cellen

## Dag-cel varianten

### Goal gehaald (✓)
```css
.day-cell.goal-met {
  background: var(--green-bg);
  border-color: var(--green);
  box-shadow: 0 0 8px rgba(123, 198, 126, 0.1);
}
/* Indicator: ✓ in groen */
```

### Goal gemist (✗)
```css
.day-cell.goal-missed {
  background: var(--red-bg);
  border-color: rgba(212, 115, 108, 0.4);
}
/* Indicator: ✗ in zacht rood, geen glow */
```

### Freeze toegepast (🛡️)
```css
.day-cell.freeze-used {
  background: var(--frost-bg);
  border-color: var(--frost);
  position: relative;
}
/* Frost patroon via pseudo-element */
.day-cell.freeze-used::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 4px,
    rgba(100, 181, 246, 0.06) 4px,
    rgba(100, 181, 246, 0.06) 8px
  );
  border-radius: inherit;
  pointer-events: none;
}
/* Indicator: 🛡️ icoon */
/* Sub-label: "beschermd" in klein frost-blauw tekst */
```

### Vandaag
```css
.day-cell.today {
  border-color: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}
```

### Toekomst
```css
.day-cell.future {
  opacity: 0.4;
}
```

## Vlammenpad (Milestone Tracker)

### Milestones
Progressieve reeks: **5, 10, 25, 50, 100**

### Visueel ontwerp
```
  5        10              25                   50              100
  🔥       🔥              🔥                    ○                ○
  ●━━━━━━━●━━━━━━━━━━━━━━▪╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌○╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌○

● behaald  — amber cirkel, subtiele pulse animatie
▪ huidig   — grotere marker, wit/amber
○ komend   — dim, alleen outline
━ gelopen  — amber lijn
╌ resterend — gestippelde grijze lijn
```

### CSS implementatie
- Flexbox container met `justify-content: space-between`
- Markers als pseudo-elements of kleine divs
- Verbindingslijn via `::after` pseudo-element op elke marker
- Huidige positie als extra marker gepositioneerd met `left: calc(...)` percentage
- Pulse animatie op behaalde markers: `@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }`

### "Bijna!" indicator
Als de huidige streak < 3 dagen van de volgende milestone is:
- De volgende milestone-marker krijgt een amber glow
- Tekst eronder: "Nog X dagen!"

## Animaties

### Bij laden
1. **Streak getal count-up** — van 0 naar huidige waarde in ~800ms met easing
2. **Milestone markers** — verschijnen één voor één met 100ms delay (stagger)
3. **Kaarten** — subtle fade-in + translate-y (van 10px naar 0)

### Interactie
- **Dag-cel hover** — zachte amber glow shadow + lichte scale(1.02)
- **Nav buttons hover** — achtergrond transitie
- **Freeze iconen** — zachte opacity transitie

### CSS keyframes
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes countUp {
  /* JS-driven via requestAnimationFrame */
}
```

## Achtergrond sfeer

```css
body {
  background: var(--bg);
  /* Warme vignette vanuit het midden */
  background-image: radial-gradient(
    ellipse at 50% 30%,
    rgba(232, 164, 74, 0.03) 0%,
    transparent 70%
  );
}
```

## Backend wijziging

De API response (`/api/steps`) moet `freezes_used` bevatten — een array van datumstrings waarop een freeze is toegepast. Dit wordt al berekend in `lib/streak.js` maar niet meegestuurd.

```json
{
  "streak": {
    "current": 23,
    "longest": 31,
    "freeze_count": 2,
    "days_toward_next_freeze": 3,
    "freezes_used": ["2026-03-06", "2026-02-15"]
  },
  "steps": [...],
  "last_synced_at": "..."
}
```

## Responsive

- **< 480px**: Vlammenpad wordt compacter (labels onder markers verborgen, alleen 🔥/○ zichtbaar)
- **< 480px**: Hero card padding verkleind
- **< 380px**: Streak getal 4rem i.p.v. 5rem
