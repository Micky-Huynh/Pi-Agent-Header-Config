# Pi Agent Header Config

Sticky Π artwork for the [pi](https://github.com/badlogic/pi-mono) coding agent TUI.

Shows a large block-character **Π**, then streams digits of π (generated with a Rabinowitz–Wagon BigInt spigot) until you type. The band scrolls left as new digits appear. The art dismisses after the first submitted message.

## Install

Copy the extension into your pi agent extensions folder:

```bash
cp custom-header.ts ~/.pi/agent/extensions/custom-header.ts
```

Or clone and copy:

```bash
git clone https://github.com/Micky-Huynh/Pi-Agent-Header-Config.git
cp Pi-Agent-Header-Config/custom-header.ts ~/.pi/agent/extensions/custom-header.ts
```

Then in an active pi session:

```text
/reload
```

Or restart pi. To show the art again later:

```text
/custom-header
```

To dismiss it and restore the built-in header:

```text
/builtin-header
```

## Requirements

- `@earendil-works/pi-coding-agent` (pi) with TUI / interactive mode
- Extensions enabled (default global folder: `~/.pi/agent/extensions/`)

## What’s included

| File | Purpose |
|------|---------|
| `custom-header.ts` | Pi extension: sticky Π + unbounded π digit stream |

No settings, auth, API keys, or personal config are included.
