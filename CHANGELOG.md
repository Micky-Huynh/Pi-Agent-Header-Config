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
