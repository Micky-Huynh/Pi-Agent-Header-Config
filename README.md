# Pi Agent Header Config

[![ci](https://github.com/Micky-Huynh/Pi-Agent-Header-Config/actions/workflows/ci.yml/badge.svg)](https://github.com/Micky-Huynh/Pi-Agent-Header-Config/actions/workflows/ci.yml)

Sticky **Π** artwork plus an unbounded **π** digit stream for the [pi](https://github.com/badlogic/pi-mono) coding agent TUI.

Shows a large block-character **Π**, then streams digits of π (Rabinowitz–Wagon BigInt spigot) until you type. The band scrolls left as new digits appear. The art dismisses after the first submitted message.

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

Or restart pi. Commands: `/pi-header` (was `/custom-header`), `/pi-header-off` (was `/builtin-header`).

### Secondary (manual copy)

Remove any legacy flat `~/.pi/agent/extensions/custom-header.ts` first so you
do not double-load both files. Then from a local checkout of this repo:

```bash
cp extensions/pi-header-art.ts ~/.pi/agent/extensions/pi-header-art.ts
```

Then `/reload` or restart pi.

## Commands

| Command | Action |
|---------|--------|
| `/pi-header` | Show / restart the sticky Π art |
| `/pi-header-off` | Clear the sticky widget |

## Don’t

- Don’t clone the whole repo into `~/.pi/agent/extensions/<folder>/` without this package layout — pi won’t load it as a package that way.
- Don’t overwrite with pi’s official `examples/extensions/custom-header.ts` — that uses **setHeader** and scrolls away with the transcript.
- Don’t expect root-only `.ts` discovery from `pi install` without this package layout (`package.json` → `pi.extensions`).

## How it works

This extension uses sticky **setWidget**, not scrollable **setHeader**. The Π art stays pinned in the TUI while digits stream; it does not ride the chat scroll history the way a header does.

## What’s included

| File | Purpose |
|------|---------|
| `extensions/pi-header-art.ts` | Pi extension: sticky Π + unbounded π digit stream |
| `package.json` | Package metadata + `pi.extensions` entry for `pi install` |
| `LICENSE` | MIT |

No settings, auth, API keys, or personal config are included.

## Requirements

- `@earendil-works/pi-coding-agent` (pi) with TUI / interactive mode
- Extensions enabled (default global folder: `~/.pi/agent/extensions/`)

## Source

```bash
git clone https://github.com/Micky-Huynh/Pi-Agent-Header-Config.git
```
