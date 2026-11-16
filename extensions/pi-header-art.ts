/**
 * Sticky TUI artwork for pi — multi-flavor shell.
 *
 * Flavors (add more under extensions/flavors/):
 *   classic     — block Π + unbounded π digit stream
 *   archimedes  — purple circle trapped by blue n-gons stepping 3 → 20 → 3
 *
 * Commands:
 *   /pi-header              — re-apply last/current flavor
 *   /pi-header <id>         — switch flavor and persist choice
 *   /pi-header list         — list flavors
 *   /pi-header-off          — clear sticky widget
 *
 * Last flavor is stored in ~/.pi/agent/pi-header-art.json so it survives
 * /reload and new sessions.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
	Theme,
} from "@earendil-works/pi-coding-agent";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import {
	DEFAULT_FLAVOR_ID,
	getFlavor,
	isFlavorId,
	listFlavors,
} from "./flavors/index.ts";

const WIDGET_KEY = "pi-art";
/** Keep art visible at least this long before a submitted message can dismiss it. */
const MIN_DISPLAY_MS = 4500;
const PREFS_FILE = () => join(getAgentDir(), "pi-header-art.json");

type Prefs = { flavor: string };

type Cleanup = () => void;

let activeCleanup: Cleanup | undefined;
let activeFlavorId = DEFAULT_FLAVOR_ID;
let shownAt = 0;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let pendingDismissCtx: ExtensionContext | undefined;

function loadPrefs(): Prefs {
	try {
		const raw = readFileSync(PREFS_FILE(), "utf8");
		const parsed = JSON.parse(raw) as Partial<Prefs>;
		if (parsed.flavor && isFlavorId(parsed.flavor)) {
			return { flavor: parsed.flavor };
		}
	} catch {
		// missing or invalid — fall through
	}
	return { flavor: DEFAULT_FLAVOR_ID };
}

function savePrefs(prefs: Prefs): void {
	try {
		const path = PREFS_FILE();
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, `${JSON.stringify(prefs, null, 2)}\n`, "utf8");
	} catch {
		// best-effort; art still works without persistence
	}
}

function stopActiveStream(): void {
	activeCleanup?.();
	activeCleanup = undefined;
}

function clearDismissTimer(): void {
	if (dismissTimer) {
		clearTimeout(dismissTimer);
		dismissTimer = undefined;
	}
	pendingDismissCtx = undefined;
}

function dismissArt(ctx: ExtensionContext): void {
	if (ctx.mode !== "tui") return;
	clearDismissTimer();
	stopActiveStream();
	ctx.ui.setWidget(WIDGET_KEY, undefined);
}

/** Dismiss now, or after the remaining minimum display time. Never blocks input. */
function scheduleDismiss(ctx: ExtensionContext): void {
	if (ctx.mode !== "tui") return;
	const elapsed = Date.now() - shownAt;
	const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
	if (wait === 0) {
		dismissArt(ctx);
		return;
	}
	pendingDismissCtx = ctx;
	if (dismissTimer) clearTimeout(dismissTimer);
	dismissTimer = setTimeout(() => {
		dismissTimer = undefined;
		const target = pendingDismissCtx;
		pendingDismissCtx = undefined;
		if (target) dismissArt(target);
	}, wait);
}

function applyFlavor(ctx: ExtensionContext, flavorId: string): void {
	if (ctx.mode !== "tui") return;

	const flavor = getFlavor(flavorId);
	activeFlavorId = flavor.id;

	clearDismissTimer();
	stopActiveStream();
	shownAt = Date.now();

	// Keep the built-in scrollable header (logo/hints). Art lives above the editor.
	ctx.ui.setHeader(undefined);

	ctx.ui.setWidget(WIDGET_KEY, (tui, theme: Theme) => {
		const widget = flavor.mount(ctx, tui, theme);
		const stop = () => {
			widget.dispose();
			if (activeCleanup === stop) activeCleanup = undefined;
		};
		activeCleanup = stop;
		return {
			render(width: number): string[] {
				return widget.render(width);
			},
			invalidate() {
				widget.invalidate();
			},
			dispose() {
				stop();
			},
		};
	});
}

function formatFlavorList(): string {
	return listFlavors()
		.map((f) => {
			const mark = f.id === activeFlavorId ? "*" : " ";
			return `${mark} ${f.id.padEnd(12)} ${f.label} — ${f.description}`;
		})
		.join("\n");
}

export default function (pi: ExtensionAPI) {
	activeFlavorId = loadPrefs().flavor;

	pi.on("session_start", async (_event, ctx) => {
		activeFlavorId = loadPrefs().flavor;
		applyFlavor(ctx, activeFlavorId);
	});

	pi.on("session_shutdown", async () => {
		clearDismissTimer();
		stopActiveStream();
	});

	// First submitted prompt: free the editor chrome. Honors MIN_DISPLAY_MS.
	pi.on("input", async (_event, ctx) => {
		scheduleDismiss(ctx);
	});

	pi.registerCommand("pi-header", {
		description:
			"Sticky TUI art — /pi-header [classic|archimedes|list]",
		handler: async (args, ctx) => {
			const raw = (args ?? "").trim().toLowerCase();
			if (raw === "list" || raw === "ls" || raw === "help") {
				if (ctx.hasUI) {
					ctx.ui.notify(
						`Sticky art flavors (* = current):\n${formatFlavorList()}`,
						"info",
					);
				}
				return;
			}

			if (raw.length > 0) {
				if (!isFlavorId(raw)) {
					if (ctx.hasUI) {
						ctx.ui.notify(
							`Unknown flavor "${raw}". Try: ${listFlavors()
								.map((f) => f.id)
								.join(", ")}`,
							"error",
						);
					}
					return;
				}
				activeFlavorId = raw;
				savePrefs({ flavor: raw });
			}

			applyFlavor(ctx, activeFlavorId);
			const flavor = getFlavor(activeFlavorId);
			if (ctx.hasUI) {
				ctx.ui.notify(
					`${flavor.label} applied (sticky) · /pi-header list`,
					"info",
				);
			}
		},
	});

	pi.registerCommand("pi-header-off", {
		description: "Clear/dismiss the sticky art widget",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") return;
			dismissArt(ctx);
			ctx.ui.setHeader(undefined);
			if (ctx.hasUI) ctx.ui.notify("Sticky art widget cleared", "info");
		},
	});
}
