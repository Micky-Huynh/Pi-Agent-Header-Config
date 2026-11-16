## [1.1.4] - 2026-11-16
- **archimedes:** slightly faster step hold (~0.5s; was 0.75s)

## [1.1.3] - 2026-11-16
- **archimedes:** slower step hold (~0.75s); cycle **5 → 20 → 5** (was 5→48→5)

## [1.1.2] - 2026-11-16
- **archimedes:** trap look from reference graphic — purple circle between **blue** inner+outer dotted polygons (vertex dots); HUD `inside < π < outside`

## [1.1.1] - 2026-11-16
- **archimedes:** blue-dotted approximating polygon; ~2× circle; step **5 → 48 → 5** (loop until typing)

## [1.1.0] - 2026-11-16
- Multi-flavor sticky art framework (`extensions/flavors/`)
- Keep **classic** Π digit stream as a selectable flavor
- Add **archimedes** — braille circle ≈ polygons (from `polygon_pi.py`)
- `/pi-header <id>` switches flavor; `/pi-header list` lists them
- Persist last flavor in `~/.pi/agent/pi-header-art.json`
- Shared `extensions/lib/braille-canvas.ts` for future scenes

## [1.0.0] - 2026-11-09
- Initial public package layout for pi install discovery
- Rename extension to extensions/pi-header-art.ts
- Slash commands: /pi-header (show/restart stream), /pi-header-off (clear sticky widget)
- Avoids collisions with pi official examples/extensions/custom-header.ts (/builtin-header)
