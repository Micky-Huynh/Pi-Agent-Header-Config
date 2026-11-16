/**
 * Pure Archimedes polygon scene (no pi imports) — shared by flavor + CI snapshot.
 */

import { BrailleCanvas, type CellColor } from "./braille-canvas.ts";

export const ART_ROWS = 12;
export const HUD_ROWS = 2;
export const HOLD_S = 1.4;
export const MORPH_S = 1.6;

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

export function sceneAt(
	state: SceneState,
): { n: number; u: number; label: number } {
	if (state.mode === "step") {
		const span = 48 - 6;
		const stepTime = 0.22;
		const k = Math.trunc(state.t / stepTime) % (2 * span);
		const n = 6 + (k <= span ? k : 2 * span - k);
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

export function paintScene(
	cv: BrailleCanvas,
	state: SceneState,
): { label: number; vi: number; vo: number } {
	const drawRows = ART_ROWS;
	const h = drawRows * 4;
	const cx = cv.width / 2;
	const cy = h / 2;
	const sec = 1 / Math.cos(Math.PI / 6);
	const R = state.outer
		? Math.min(cv.width / 2, h / 2) / (sec * 1.04)
		: (Math.min(cv.width, h) / 2) * 0.94;
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

	if (state.showCircle) cv.circle(cx, cy, R, COLOR.circle, 2);
	if (state.outer) cv.polygon(toScreen(outer), COLOR.outer);
	cv.polygon(toScreen(inner), COLOR.inner);

	cv.putTextCenter(
		drawRows,
		`Archimedes' polygons  ·  ${label} sides`,
		COLOR.hud,
	);
	const stats = state.outer
		? `inside ${vi.toFixed(4)}  <  π  <  ${vo.toFixed(4)}  outside     gap ${(vo - vi).toFixed(4)}`
		: `inside perimeter ${vi.toFixed(4)}     π = ${Math.PI.toFixed(4)}…     error ${(Math.PI - vi).toFixed(4)}`;
	cv.putTextCenter(
		drawRows + 1,
		stats,
		state.outer ? COLOR.hudDim : COLOR.inner,
	);

	return { label, vi, vo };
}

export function snapshotArchimedes(
	cols: number,
	t: number,
	opts?: Partial<Pick<SceneState, "mode" | "outer" | "showCircle">>,
): string {
	const state: SceneState = {
		t,
		mode: opts?.mode ?? "double",
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
