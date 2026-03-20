# Spec: Streak Milestone Tracker (Vlammenpad)

## Beschrijving
Visuele progressiebalk met milestones op 5, 10, 25, 50, 100 dagen die laat zien hoe ver de gebruiker is in zijn streak.

## Acceptatiecriteria
- [ ] Vlammenpad zichtbaar in de hero card, onder het streak getal
- [ ] Milestones op: 5, 10, 25, 50, 100
- [ ] Behaalde milestones: amber cirkel met 🔥, subtiele pulse animatie
- [ ] Huidige positie: grotere marker op de lijn
- [ ] Toekomstige milestones: dim, alleen outline
- [ ] Verbindingslijn: amber (behaald) → gestippeld grijs (resterend)
- [ ] Als streak < 3 dagen van volgende milestone: "Nog X dagen!" tekst + glow op volgende marker
- [ ] Responsive: op < 480px worden labels verborgen, alleen iconen zichtbaar
