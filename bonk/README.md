# Bonk Royale

A silly two-player lane battler for one phone. Every card copies a classic card's exact stats (tournament level 11), with original art painted in ChatGPT.

- Hold the phone sideways: players sit side by side (blue on the left, red on the right).
- Hold it upright: players sit face to face (red's hand is upside down at the top).
- `index.html` is the whole game with the art inlined.
- `src/` holds the source: `cards.js` (card stats), `core.js` (simulation and bot), `render.js` (drawing and touch), `ui.js` (menus), `head.html` (page shell and CSS), `build.py` (builds `index.html`), `cut.py` / `fixups.py` (cut the painted sheets into sprites).
