# UNO Fiesta upgrade plan (2026-11-22)

The 27 ideas from VIRUS! (Desktop/virusgame) as adapted for UNO Mentiroso
(Desktop/unomentiroso, UPGRADE-PLAN.md there), now adapted to UNO Fiesta's rules.
The new files start as copies of Mentiroso's and are changed for Fiesta:
- `i18n.js`     — `t()` ES/EN, language switch, English log translation (Fiesta's log lines)
- `fx.js`       — sounds, flying cards, spotlight, stamps; events read from state changes
- `extras.js`   — faces, banner/timer, 2-card alert, badges, zoom, ⚙️ menu, awards, stats,
                  quick bots, invite/QR, throws, reconnect badge
- `extras.css`  — all new styles (style.css untouched)
- `tutorial.js` — guided first game on an in-memory room ('TUTORIAL')

## How Fiesta differs from Mentiroso (what changes in the adaptation)
- Every card is played face up, so the played card is read from the player's hand
  (what left it) — no "dice" spotlight for bluffs, no Verdad/Mentira label, no 🎭 badge.
- Stamps go to the Wild +4 challenge: "¡DESAFÍO GANADO!" / "¡ERA VÁLIDO!".
- Extra effects: ☝️ Apunta y Toma (everyone points), 📚 Pila Salvaje, 🔗 Enlace + ⚡ Eco.
- Timer: turn → draw and pass; Apunta y Toma vote → point at the player with fewest cards;
  mini-pile holder → take the pile; Wild +4 target → accept.
- Bots (`bot_…` ids, runBotTick engine): personalities change which cards they prefer
  (attacks, saving wilds, party cards); levels change UNO catching / shouting and +4 choices.
- Awards: Rayo (speed plays), Blanco fácil (pointed at), Coleccionista, Cazador de UNO,
  Abogado (won +4 challenges).
- Guided game: match a colour, +2, Apunta y Toma (play + point), Comodín (pick colour),
  play to 1 card, shout UNO, win.
- Rooms get `game: 'fiesta'` (all three games share the 'rooms' collection).

## Steps
1. [x] Copy + adapt i18n.js / fx.js (Fiesta events) + hooks in app.js
2. [x] extras.js adapted (faces, timer, badges, zoom, menu, awards, bots, invite, throws)
3. [x] index.html: menu, rules window, start page buttons, PWA tags, scripts
4. [x] Bot personalities + levels in the bot engine
5. [x] Guided first game
6. [x] Icons, manifest, card look, English, tests
