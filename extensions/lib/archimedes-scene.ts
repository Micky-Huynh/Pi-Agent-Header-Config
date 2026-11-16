/**
 * Pure Archimedes polygon scene (no pi imports) — shared by flavor + CI snapshot.
 *
 * Default look: purple circle trapped between blue-dotted inner+outer n-gons
 * stepping 3 → 20 → 3 (until input) — “Archimedes trapped π”.
 */

import { BrailleCanvas, type CellColor } from "./braille-canvas.ts";

/** Tall enough that a ~2× circle still fits above the HUD. */
export const ART_ROWS = 20;
export const HUD_ROWS = 2;
export const HOLD_S = 1.4;
export const MORPH_S = 1.6;

/** Inclusive side-count range for step mode (triangle → end → back). */
export const N_MIN = 3;
export const N_MAX = 20;
/** Seconds spent on each side count before advancing. */
export const STEP_HOLD_S = 0.5;
/** Braille-dot stride along polygon edges (higher = sparser blue dots). */
export const POLYGON_DOT_STRIDE = 2;

const TOP = -Math.PI / 2;

export const COLOR = {
	circle: "circle",
	inner: "inner",
	outer: "outer",
	hud: "hud",
	hudDim: "hudDim",
} as const;

export type Mode = "double" | "step";

export type SceneState = {
	t: number;
	mode: Mode;
	outer: boolean;
	showCircle: boolean;
	speed: number;
	paused: boolean;
};

function ease(x: number): number {
	const t = Math.max(0, Math.min(1, x));
	return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

function pIn(n: number): number {
	return n * Math.sin(Math.PI / n);
}

function pOut(n: number): number {
	return n * Math.tan(Math.PI / n);
}

function innerShape(n: number, u: number): Array<[number, number]> {
	const c = Math.cos(Math.PI / n);
	const pts: Array<[number, number]> = [];
	for (let j = 0; j < 2 * n; j++) {
		const r = j % 2 === 0 ? 1.0 : c + (1 - c) * u;
		const a = TOP + (j * Math.PI) / n;
		pts.push([r * Math.cos(a), r * Math.sin(a)]);
	}
	return pts;
}

function outerShape(n: number, u: number): Array<[number, number]> {
	const s1 = 1 / Math.cos(Math.PI / n);
	const s2 = 1 / Math.cos(Math.PI / (2 * n));
	const pts: Array<[number, number]> = [];
	for (let i = 0; i < 4 * n; i++) {
		const m = i % 4;
		const r = m === 0 ? 1.0 : m === 2 ? s1 + (1 - s1) * u : s2;
		const a = TOP + (i * Math.PI) / (2 * n);
		pts.push([r * Math.cos(a), r * Math.sin(a)]);
	}
	return pts;
}

function regular(n: number, r = 1.0): Array<[number, number]> {
	const pts: Array<[number, number]> = [];
	for (let k = 0; k < n; k++) {
		const a = TOP + (2 * Math.PI * k) / n;
		pts.push([r * Math.cos(a), r * Math.sin(a)]);
	}
	return pts;
}

/**
 * Triangle wave over [N_MIN, N_MAX]: 3,4,…,20,19,…,3,4,… forever.
 */
export function sceneAt(
	state: SceneState,
): { n: number; u: number; label: number } {
	if (state.mode === "step") {
		const span = N_MAX - N_MIN;
		const k = Math.trunc(state.t / STEP_HOLD_S) % (2 * span);
		const n = N_MIN + (k <= span ? k : 2 * span - k);
		return { n, u: 0, label: n };
	}
	const seg = HOLD_S + MORPH_S;
	const steps = [6, 12, 24];
	const cyc = state.t % (2 * steps.length * seg);
	const i = Math.trunc(cyc / seg);
	const local = cyc - i * seg;
	if (i < steps.length) {
		const n = steps[i]!;
		const u = ease((local - HOLD_S) / MORPH_S);
		return { n, u, label: u > 0.5 ? 2 * n : n };
	}
	const j = 2 * steps.length - 1 - i;
	const n = steps[j]!;
	const u = 1 - ease((local - HOLD_S) / MORPH_S);
	return { n, u, label: u > 0.5 ? 2 * n : n };
}

/**
 * Circle radius sized so the outer trap still fits (~2× the original band scale).
 * Outer circumscribed n-gon reaches r / cos(π/n); leave margin for N_MIN.
 */
function circleRadius(
	cv: BrailleCanvas,
	drawRows: number,
	outer: boolean,
): number {
	const h = drawRows * 4;
	const half = Math.min(cv.width / 2, h / 2);
	if (outer) {
		const sec = 1 / Math.cos(Math.PI / N_MIN);
		// Slightly tighter than half/sec so the trap fills the band like the graphic.
		return (half * 0.96) / sec;
	}
	return half * 0.98;
}

export function paintScene(
	cv: BrailleCanvas,
	state: SceneState,
): { label: number; vi: number; vo: number } {
	const drawRows = ART_ROWS;
	const h = drawRows * 4;
	const cx = cv.width / 2;
	const cy = h / 2;
	const R = circleRadius(cv, drawRows, state.outer);
	const toScreen = (pts: Array<[number, number]>): Array<[number, number]> =>
		pts.map(([x, y]) => [cx + x * R, cy + y * R]);

	const { n, u, label } = sceneAt(state);
	let inner: Array<[number, number]>;
	let outer: Array<[number, number]>;
	let vi: number;
	let vo: number;
	if (state.mode === "step") {
		inner = regular(n);
		outer = regular(n, 1 / Math.cos(Math.PI / n));
		vi = pIn(n);
		vo = pOut(n);
	} else {
		inner = innerShape(n, u);
		outer = outerShape(n, u);
		vi = pIn(n) + (pIn(2 * n) - pIn(n)) * u;
		vo = pOut(n) + (pOut(2 * n) - pOut(n)) * u;
	}

	// Draw order: outer trap → purple circle → inner trap (graphic sandwich).
	if (state.outer) {
		cv.polygon(toScreen(outer), COLOR.outer, POLYGON_DOT_STRIDE, true);
	}
	if (state.showCircle) cv.circle(cx, cy, R, COLOR.circle, 2);
	cv.polygon(toScreen(inner), COLOR.inner, POLYGON_DOT_STRIDE, true);

	// Side count centered on the circle (number on geometric mid-row, "sides" under it).
	const centerRow = Math.floor(cy / 4);
	cv.putTextCenter(centerRow, `${label}`, COLOR.hud);
	cv.putTextCenter(centerRow + 1, "sides", COLOR.hudDim);

	cv.putTextCenter(drawRows, "Archimedes trapped π", COLOR.hud);
	const stats = state.outer
		? `${vi.toFixed(4)}  <  π  <  ${vo.toFixed(4)}`
		: `inside ${vi.toFixed(4)}     π = ${Math.PI.toFixed(4)}…`;
	cv.putTextCenter(drawRows + 1, stats, COLOR.hudDim);
	// Note: "perimeter ÷ diameter" is rendered by the flavor subtitle when outer.

	return { label, vi, vo };
}

export function snapshotArchimedes(
	cols: number,
	t: number,
	opts?: Partial<Pick<SceneState, "mode" | "outer" | "showCircle">>,
): string {
	const state: SceneState = {
		t,
		mode: opts?.mode ?? "step",
		outer: opts?.outer ?? true,
		showCircle: opts?.showCircle ?? true,
		speed: 1,
		paused: false,
	};
	const cv = new BrailleCanvas(cols, ART_ROWS + HUD_ROWS);
	paintScene(cv, state);
	return cv.plain().join("\n");
}

export type { CellColor };
