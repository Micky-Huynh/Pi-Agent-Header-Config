# Pi Agent Header Config

[![ci](https://github.com/Micky-Huynh/Pi-Agent-Header-Config/actions/workflows/ci.yml/badge.svg)](https://github.com/Micky-Huynh/Pi-Agent-Header-Config/actions/workflows/ci.yml)

Sticky **TUI artwork** for the [pi](https://github.com/badlogic/pi-mono) coding agent — multi-flavor, sticky via `setWidget`.

## Flavors

| Id | Look |
|----|------|
| `classic` | Large block **Π**, then unbounded π digits (Rabinowitz–Wagon spigot) scrolling left |
| `archimedes` | **Archimedes trapped π** — purple circle between **blue-dotted** inner+outer n-gons stepping **3 → 20 → 3** (loops until you type) |

Last chosen flavor is saved to `~/.pi/agent/pi-header-art.json` so it survives `/reload` and new sessions. Default is `classic` until you switch.

## Install

### Primary (recommended)

If a legacy flat `~/.pi/agent/extensions/custom-header.ts` is present, remove it
first so the package does not double-load with the old file.

```bash
pi install git:github.com/Micky-Huynh/Pi-Agent-Header-Config
```

Then in an active pi session:

```text
/reload
```

Or restart pi.

### Secondary (manual copy)

Prefer the package install above. For a one-file smoke test only:

```bash
# Not recommended for multi-flavor layout — use pi install so relative imports resolve.
pi install git:github.com/Micky-Huynh/Pi-Agent-Header-Config
```

## Commands

| Command | Action |
|---------|--------|
| `/pi-header` | Show / restart the current flavor |
| `/pi-header classic` | Switch to classic Π stream (persisted) |
| `/pi-header archimedes` | Switch to Archimedes polygons (persisted) |
| `/pi-header list` | List flavors (`*` = current) |
| `/pi-header-off` | Clear the sticky widget |

Art dismisses after the first submitted message (honors a short minimum display time). Typing pauses classic digit stream / Archimedes morph; the widget stays until dismiss.

## Don’t

- Don’t clone the whole repo into `~/.pi/agent/extensions/<folder>/` without this package layout — pi won’t load it as a package that way.
- Don’t overwrite with pi’s official `examples/extensions/custom-header.ts` — that uses **setHeader** and scrolls away with the transcript.
- Don’t expect root-only `.ts` discovery from `pi install` without this package layout (`package.json` → `pi.extensions`).

## How it works

Sticky **setWidget**, not scrollable **setHeader**. Flavors live under `extensions/flavors/`; the shell (`extensions/pi-header-art.ts`) owns lifecycle, commands, and prefs. Shared braille canvas: `extensions/lib/braille-canvas.ts` (reuse for new scenes).

### Adding a flavor

1. Create `extensions/flavors/<name>.ts` implementing `ArtFlavor` (`mount` returns a widget).
2. Register it in `extensions/flavors/index.ts`.
3. Document the id in this README + CHANGELOG.

## What’s included

| Path | Purpose |
|------|---------|
| `extensions/pi-header-art.ts` | Commands, sticky lifecycle, flavor prefs |
| `extensions/flavors/` | `classic`, `archimedes`, registry |
| `extensions/lib/braille-canvas.ts` | Braille dot canvas for polygon / scene art |
| `package.json` | `pi.extensions` entry for `pi install` |
| `LICENSE` | MIT |

No settings, auth, API keys, or personal config are included in the package (prefs write only the flavor id under your agent dir).

## Requirements

- `@earendil-works/pi-coding-agent` (pi) with TUI / interactive mode
- Unicode / braille-capable terminal font for `archimedes`

## Source

```bash
git clone https://github.com/Micky-Huynh/Pi-Agent-Header-Config.git
```
