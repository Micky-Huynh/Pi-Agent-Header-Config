/**
 * Archimedes' polygons sticky flavor — wraps pure scene + theme paint.
 * Scene math: extensions/lib/archimedes-scene.ts (from Desktop/polygon_pi.py).
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { BrailleCanvas, type CellColor } from "../lib/braille-canvas.ts";
import {
	ART_ROWS,
	COLOR,
	HUD_ROWS,
	paintScene,
	type SceneState,
	snapshotArchimedes as snapshotScene,
} from "../lib/archimedes-scene.ts";
import type { ArtFlavor, FlavorTui, FlavorWidget } from "./types.ts";

const FRAME_MS = 67; // ~15 fps

function paintRole(theme: Theme, ch: string, color: CellColor): string {
	if (!ch || ch === " ") return ch;
	switch (color) {
		case COLOR.circle:
			return theme.fg("muted", ch);
		case COLOR.inner:
			return theme.bold(theme.fg("accent", ch));
		case COLOR.outer:
			return theme.fg("warning", ch);
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
		mode: "double",
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
	let cachedLabel = 6;

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
							`  · archimedes · ${cachedLabel} sides · art stays until you send a message`,
						)
					: theme.fg(
							"dim",
							`  · archimedes · morphing 6→48 · type to pause`,
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
	description: "Circle ≈ n-gons morphing 6 → 12 → 24 → 48",
	mount: mountArchimedes,
};
