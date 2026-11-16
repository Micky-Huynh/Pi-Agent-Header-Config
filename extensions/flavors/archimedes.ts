/**
 * Archimedes' polygons sticky flavor — wraps pure scene + theme paint.
 * Scene math: extensions/lib/archimedes-scene.ts (from Desktop/polygon_pi.py).
 *
 * Default: purple circle trapped between blue-dotted inner+outer n-gons
 * stepping 5 → 48 → 5 until typing (“Archimedes trapped π”).
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { BrailleCanvas, type CellColor } from "../lib/braille-canvas.ts";
import {
	ART_ROWS,
	COLOR,
	HUD_ROWS,
	N_MAX,
	N_MIN,
	paintScene,
	type SceneState,
	snapshotArchimedes as snapshotScene,
} from "../lib/archimedes-scene.ts";
import type { ArtFlavor, FlavorTui, FlavorWidget } from "./types.ts";

const FRAME_MS = 67; // ~15 fps

/** Explicit blue for both trap polygons + vertex dots (not a theme token). */
const POLYGON_BLUE = { kind: "rgb" as const, r: 64, g: 156, b: 255 };
/** Explicit purple for the trapped circle. */
const CIRCLE_PURPLE = { kind: "rgb" as const, r: 168, g: 120, b: 255 };

function paintRole(theme: Theme, ch: string, color: CellColor): string {
	if (!ch || ch === " ") return ch;
	switch (color) {
		case COLOR.circle:
			return theme.style(ch, { fg: CIRCLE_PURPLE, bold: true });
		case COLOR.inner:
		case COLOR.outer:
			return theme.style(ch, { fg: POLYGON_BLUE, bold: true });
		case COLOR.hud:
			return theme.bold(theme.fg("accent", ch));
		case COLOR.hudDim:
			return theme.fg("dim", ch);
		default:
			return theme.fg("accent", ch);
	}
}

function mountArchimedes(
	ctx: ExtensionContext,
	tui: FlavorTui,
	theme: Theme,
): FlavorWidget {
	const state: SceneState = {
		t: 0,
		mode: "step",
		outer: true,
		showCircle: true,
		speed: 1,
		paused: false,
	};

	let stopped = false;
	let lastTick = Date.now();
	let timer: ReturnType<typeof setInterval> | undefined;
	let unsubscribeInput: (() => void) | undefined;
	let cachedCols = 0;
	let cachedLines: string[] = [];
	let cachedLabel = N_MIN;

	const rebuild = (cols: number) => {
		const cv = new BrailleCanvas(cols, ART_ROWS + HUD_ROWS);
		const meta = paintScene(cv, state);
		cachedCols = cols;
		cachedLines = cv.paint((ch, color) => paintRole(theme, ch, color));
		cachedLabel = meta.label;
	};

	const stop = () => {
		if (stopped) return;
		stopped = true;
		state.paused = true;
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
		unsubscribeInput?.();
		unsubscribeInput = undefined;
		tui.requestRender();
	};

	timer = setInterval(() => {
		if (stopped || state.paused) return;
		const now = Date.now();
		const dt = Math.min((now - lastTick) / 1000, 0.25);
		lastTick = now;
		state.t += dt * state.speed;
		cachedCols = 0;
		tui.requestRender();
	}, FRAME_MS);

	// Typing pauses the loop; widget stays until first submitted message dismisses it.
	unsubscribeInput = ctx.ui.onTerminalInput(() => {
		stop();
		return undefined;
	});

	return {
		render(width: number): string[] {
			const cols = Math.max(36, Math.min(width, 72));
			if (cols !== cachedCols) rebuild(cols);

			const subtitle =
				theme.bold(theme.fg("accent", "pi")) +
				theme.fg("dim", ` v${VERSION}`) +
				(stopped
					? theme.fg(
							"dim",
							`  · archimedes · ${cachedLabel} sides · trap stays until you send a message`,
						)
					: theme.fg(
							"dim",
							`  · archimedes · trap ${N_MIN}→${N_MAX}→${N_MIN} · perimeter ÷ diameter · type to pause`,
						));

			return [...cachedLines, subtitle];
		},
		invalidate() {
			cachedCols = 0;
		},
		dispose() {
			stop();
		},
	};
}

/** Re-export for callers that import the flavor module. */
export const snapshotArchimedes = snapshotScene;

export const archimedesFlavor: ArtFlavor = {
	id: "archimedes",
	label: "Archimedes polygons",
	description: `Purple circle trapped by blue-dotted n-gons ${N_MIN} → ${N_MAX} → ${N_MIN}`,
	mount: mountArchimedes,
};
