/**
 * Braille dot canvas for sticky TUI artwork.
 * Ported from polygon_pi.py — 2×4 dots per character cell.
 */

export const BRAILLE_BASE = 0x2800;

/** Dot bit for (dx, dy) inside a 2×4 braille cell. */
const BRAILLE_BITS: readonly [number, number][] = [
	[0x01, 0x08],
	[0x02, 0x10],
	[0x04, 0x20],
	[0x40, 0x80],
];

export type CellColor = string | null;

export class BrailleCanvas {
	readonly cols: number;
	readonly rows: number;
	readonly width: number;
	readonly height: number;
	private bits: number[][] = [];
	private color: CellColor[][] = [];
	private text = new Map<string, { ch: string; color: CellColor }>();

	constructor(cols: number, rows: number) {
		this.cols = Math.max(1, cols | 0);
		this.rows = Math.max(1, rows | 0);
		this.width = this.cols * 2;
		this.height = this.rows * 4;
		this.clear();
	}

	clear(): void {
		this.bits = Array.from({ length: this.rows }, () =>
			Array.from({ length: this.cols }, () => 0),
		);
		this.color = Array.from({ length: this.rows }, () =>
			Array.from({ length: this.cols }, () => null as CellColor),
		);
		this.text.clear();
	}

	dot(x: number, y: number, color: CellColor = null): void {
		const xi = Math.round(x);
		const yi = Math.round(y);
		if (xi < 0 || yi < 0 || xi >= this.width || yi >= this.height) return;
		const c = xi >> 1;
		const r = yi >> 2;
		this.bits[r]![c]! |= BRAILLE_BITS[yi & 3]![xi & 1]!;
		if (color !== null) this.color[r]![c] = color;
	}

	line(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		color: CellColor = null,
		dotted = 1,
	): void {
		const steps = Math.trunc(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) + 1;
		const stride = Math.max(1, dotted | 0);
		for (let i = 0; i <= steps; i += stride) {
			const u = i / steps;
			this.dot(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, color);
		}
		// Always land the endpoint so polygons close cleanly when strided.
		if (stride > 1) this.dot(x1, y1, color);
	}

	polygon(
		pts: Array<[number, number]>,
		color: CellColor = null,
		dotted = 1,
		/** Extra vertex dots (graphic-style trap vertices). */
		vertexDots = false,
	): void {
		if (pts.length < 2) return;
		for (let i = 0; i < pts.length; i++) {
			const [x0, y0] = pts[i]!;
			const [x1, y1] = pts[(i + 1) % pts.length]!;
			this.line(x0, y0, x1, y1, color, dotted);
		}
		if (vertexDots) {
			for (const [x, y] of pts) this.dot(x, y, color);
		}
	}

	circle(
		cx: number,
		cy: number,
		r: number,
		color: CellColor = null,
		dotted = 1,
	): void {
		const n = Math.max(64, Math.trunc(2 * Math.PI * r));
		for (let i = 0; i < n; i += Math.max(1, dotted)) {
			const a = (2 * Math.PI * i) / n;
			this.dot(cx + r * Math.cos(a), cy + r * Math.sin(a), color);
		}
	}

	putText(row: number, col: number, s: string, color: CellColor = null): void {
		for (let i = 0; i < s.length; i++) {
			const c = col + i;
			if (row < 0 || row >= this.rows || c < 0 || c >= this.cols) continue;
			this.text.set(`${row},${c}`, { ch: s[i]!, color });
		}
	}

	putTextCenter(row: number, s: string, color: CellColor = null): void {
		// round() (not floor) so short labels sit on the braille/circle center
		// on even column counts instead of half a cell to the left.
		this.putText(row, Math.round((this.cols - s.length) / 2), s, color);
	}

	/**
	 * Render rows as plain characters (no ANSI). Useful for tests/snapshots.
	 */
	plain(): string[] {
		const lines: string[] = [];
		for (let r = 0; r < this.rows; r++) {
			let row = "";
			for (let c = 0; c < this.cols; c++) {
				const t = this.text.get(`${r},${c}`);
				const b = this.bits[r]![c]!;
				row += t ? t.ch : b ? String.fromCharCode(BRAILLE_BASE + b) : " ";
			}
			lines.push(row.replace(/\s+$/, ""));
		}
		return lines;
	}

	/**
	 * Render rows with a per-cell color painter (theme.fg wrappers, etc.).
	 */
	paint(paintCell: (ch: string, color: CellColor) => string): string[] {
		const lines: string[] = [];
		for (let r = 0; r < this.rows; r++) {
			let row = "";
			for (let c = 0; c < this.cols; c++) {
				const t = this.text.get(`${r},${c}`);
				if (t) {
					row += paintCell(t.ch, t.color);
					continue;
				}
				const b = this.bits[r]![c]!;
				if (!b) {
					row += " ";
					continue;
				}
				row += paintCell(
					String.fromCharCode(BRAILLE_BASE + b),
					this.color[r]![c] ?? null,
				);
			}
			lines.push(row.replace(/\s+$/, "") === "" ? "" : row);
		}
		return lines;
	}
}
