# Arcfall

Sky cannon battles for up to 8 friends, in the browser. One laptop or tablet is the big screen; everyone else scans the QR code in the lobby and their phone becomes their controller. No app, no sign-in.

Play: https://owenchai33-byte.github.io/arcfall/

- `index.html` is the whole game (art inlined).
- Phones connect through free public MQTT relays (EMQX and HiveMQ, both at once).
- `src/` holds the source (`v2-head.html`, `v2-game.js`) and `assemble.py`, which builds `index.html`.
