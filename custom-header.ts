/**
 * Custom Header Extension
 *
 * Shows a large block-character Π in a sticky widget above the editor
 * (not the scrollable startup header), then streams digits of π in the
 * same style until the user types. Digits are generated on the fly with a
 * Rabinowitz–Wagon BigInt spigot (near-infinite while idle). The whole band
 * (Π, then digits) scrolls left as one unit: each new digit appears on the
 * right and pushes older glyphs — including Π — off the left edge. The art
 * stays on screen while chat scrolls; it dismisses after the first submitted
 * message, honoring a short minimum display time so a fast launch prompt
 * cannot yank it away.
 *
 * Commands:
 *   /custom-header   — re-apply the sticky Π art (restarts the digit stream)
 *   /builtin-header  — dismiss the art and restore pi's built-in header
 */

import type {
	ExtensionAPI,
	ExtensionContext,
	Theme,
} from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";

const DIGIT_INTERVAL_MS = 180;
const GLYPH_GAP = "  ";
const WIDGET_KEY = "pi-art";
/** Keep art visible at least this long before a submitted message can dismiss it. */
const MIN_DISPLAY_MS = 4500;
/**
 * Max glyphs retained in the scrolling band (includes Π + digits).
 * Far more than any terminal width needs; caps memory + render work.
 */
const MAX_WINDOW_GLYPHS = 128;

/**
 * 9-row block glyphs. Pure █ / space only — box-drawing breaks in many terminals.
 * Each glyph is left-padded to a fixed width for clean horizontal joins.
 */
const DIGIT_GLYPHS: Record<string, string[]> = {
	"0": [
		" ███████ ",
		"██     ██",
		"██     ██",
		"██     ██",
		"██     ██",
		"██     ██",
		"██     ██",
		"██     ██",
		" ███████ ",
	],
	"1": [
		"   ███   ",
		" █████   ",
		"   ███   ",
		"   ███   ",
		"   ███   ",
		"   ███   ",
		"   ███   ",
		"   ███   ",
		" ███████ ",
	],
	"2": [
		" ███████ ",
		"██     ██",
		"       ██",
		"      ██ ",
		"    ███  ",
		"  ███    ",
		" ██      ",
		"██       ",
		"█████████",
	],
	"3": [
		" ███████ ",
		"██     ██",
		"       ██",
		"       ██",
		"  ██████ ",
		"       ██",
		"       ██",
		"██     ██",
		" ███████ ",
	],
	"4": [
		"██     ██",
		"██     ██",
		"██     ██",
		"██     ██",
		"█████████",
		"       ██",
		"       ██",
		"       ██",
		"       ██",
	],
	"5": [
		"█████████",
		"██       ",
		"██       ",
		"██       ",
		"████████ ",
		"       ██",
		"       ██",
		"██     ██",
		" ███████ ",
	],
	"6": [
		" ███████ ",
		"██     ██",
		"██       ",
		"██       ",
		"████████ ",
		"██     ██",
		"██     ██",
		"██     ██",
		" ███████ ",
	],
	"7": [
		"█████████",
		"       ██",
		"      ██ ",
		"     ██  ",
		"    ██   ",
		"   ██    ",
		"  ██     ",
		" ██      ",
		"██       ",
	],
	"8": [
		" ███████ ",
		"██     ██",
		"██     ██",
		"██     ██",
		" ███████ ",
		"██     ██",
		"██     ██",
		"██     ██",
		" ███████ ",
	],
	"9": [
		" ███████ ",
		"██     ██",
		"██     ██",
		"██     ██",
		" ████████",
		"       ██",
		"       ██",
		"██     ██",
		" ███████ ",
	],
	".": [
		"         ",
		"         ",
		"         ",
		"         ",
		"         ",
		"         ",
		"         ",
		"  ████   ",
		"  ████   ",
	],
};

/** Larger capital Π — same height as digit glyphs for side-by-side streaming. */
function getLargePi(): string[] {
	return [
		"████████████████████████████████████",
		"████████████████████████████████████",
		"  ████████            ████████  ",
		"  ████████            ████████  ",
		"  ████████            ████████  ",
		"  ████████            ████████  ",
		"  ████████            ████████  ",
		"██████████          ██████████",
		"██████████          ██████████",
	];
}

/**
 * Rabinowitz–Wagon unbounded spigot for decimal digits of π.
 * Yields 3, then fractional digits forever (caller inserts the radix point).
 * BigInts grow slowly with digit count; fine for idle TUI streaming.
 */
class PiDigitSpigot {
	private q = 1n;
	private r = 0n;
	private t = 1n;
	private k = 1n;
	private n = 3n;
	private l = 3n;

	nextDigit(): number {
		for (;;) {
			if (4n * this.q + this.r - this.t < this.n * this.t) {
				const digit = Number(this.n);
				const nr = 10n * (this.r - this.n * this.t);
				this.n = (10n * (3n * this.q + this.r)) / this.t - 10n * this.n;
				this.q *= 10n;
				this.r = nr;
				return digit;
			}
			const nr = (2n * this.q + this.r) * this.l;
			const nn =
				(this.q * (7n * this.k) + 2n + this.r * this.l) / (this.t * this.l);
			this.q *= this.k;
			this.t *= this.l;
			this.l += 2n;
			this.k += 1n;
			this.n = nn;
			this.r = nr;
		}
	}
}

/** Display stream: '3', '.', then unbounded fractional digits. */
class PiDisplayStream {
	private readonly spigot = new PiDigitSpigot();
	private phase: "ones" | "dot" | "frac" = "ones";
	/** Decimal digits produced (excludes the radix point). */
	digitsProduced = 0;

	nextChar(): string {
		if (this.phase === "ones") {
			this.phase = "dot";
			this.digitsProduced++;
			return String(this.spigot.nextDigit());
		}
		if (this.phase === "dot") {
			this.phase = "frac";
			return ".";
		}
		this.digitsProduced++;
		return String(this.spigot.nextDigit());
	}
}

function glyphWidth(glyph: string[]): number {
	return Math.max(0, ...glyph.map((line) => line.length));
}

function padGlyph(glyph: string[]): string[] {
	const width = glyphWidth(glyph);
	return glyph.map((line) => line.padEnd(width, " "));
}

/**
 * Join the scrolling band into ~9 art rows. When wider than maxWidth, oldest
 * glyphs drop off the left (Π leaves permanently once shifted out).
 */
function composeScrollingBand(glyphs: string[][], maxWidth: number): string[] {
	if (glyphs.length === 0) return [];

	const padded = glyphs.map(padGlyph);
	const height = padded[0]!.length;
	const gap = GLYPH_GAP;
	const usable = Math.max(maxWidth, glyphWidth(padded[padded.length - 1]!));

	const widthFrom = (from: number): number => {
		let w = 0;
		for (let i = from; i < padded.length; i++) {
			const gw = glyphWidth(padded[i]!);
			w = i === from ? gw : w + gap.length + gw;
		}
		return w;
	};

	// Scroll entire band left: drop oldest glyphs (Π / digits) until it fits.
	let start = 0;
	while (start < padded.length - 1 && widthFrom(start) > usable) {
		start++;
	}

	const visible = padded.slice(start);
	const lines: string[] = [];
	for (let row = 0; row < height; row++) {
		lines.push(visible.map((g) => g[row]!).join(gap));
	}
	return lines;
}

function formatCount(n: number): string {
	return n.toLocaleString("en-US");
}

type Cleanup = () => void;

let activeCleanup: Cleanup | undefined;
let shownAt = 0;
let dismissTimer: ReturnType<typeof setTimeout> | undefined;
let pendingDismissCtx: ExtensionContext | undefined;

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

function applyCustomArt(ctx: ExtensionContext): void {
	// Sticky widgets and setHeader are TUI-only; hasUI is also true in RPC.
	if (ctx.mode !== "tui") return;

	clearDismissTimer();
	stopActiveStream();
	shownAt = Date.now();

	// Keep the built-in scrollable header (logo/hints). Art lives above the editor
	// so follow-end chat scrolling cannot push it off-screen.
	ctx.ui.setHeader(undefined);

	ctx.ui.setWidget(WIDGET_KEY, (tui, theme: Theme) => {
		const paint = (line: string) =>
			line.length === 0 ? line : theme.bold(theme.fg("accent", line));

		const stream = new PiDisplayStream();
		/**
		 * Full scrolling band, oldest-first. Starts as [Π]; digits append.
		 * Never re-inject Π — once it shifts off the left, it stays gone.
		 */
		const bandGlyphs: string[][] = [getLargePi()];
		let stopped = false;
		let timer: ReturnType<typeof setInterval> | undefined;
		let unsubscribeInput: (() => void) | undefined;

		const stop = () => {
			if (stopped) return;
			stopped = true;
			if (timer) {
				clearInterval(timer);
				timer = undefined;
			}
			unsubscribeInput?.();
			unsubscribeInput = undefined;
			if (activeCleanup === stop) activeCleanup = undefined;
			tui.requestRender();
		};

		activeCleanup = stop;

		timer = setInterval(() => {
			if (stopped) return;
			const ch = stream.nextChar();
			const glyph = DIGIT_GLYPHS[ch];
			if (glyph) bandGlyphs.push(glyph);
			while (bandGlyphs.length > MAX_WINDOW_GLYPHS) {
				bandGlyphs.shift();
			}
			tui.requestRender();
		}, DIGIT_INTERVAL_MS);

		// Any keypress / paste stops the stream; do not consume so typing still works.
		unsubscribeInput = ctx.ui.onTerminalInput(() => {
			stop();
			return undefined;
		});

		return {
			render(width: number): string[] {
				const art = composeScrollingBand(
					bandGlyphs,
					Math.max(40, width),
				).map(paint);

				const countLabel = formatCount(stream.digitsProduced);
				const subtitle =
					theme.bold(theme.fg("accent", "pi")) +
					theme.fg("dim", ` v${VERSION}`) +
					(stopped
						? theme.fg(
								"dim",
								`  · paused at ${countLabel} digits · art stays until you send a message`,
							)
						: theme.fg(
								"dim",
								`  · streaming π · ${countLabel} digits — type to stop`,
							));

				return [...art, subtitle];
			},
			invalidate() {},
			dispose() {
				stop();
			},
		};
	});
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		applyCustomArt(ctx);
	});

	pi.on("session_shutdown", async () => {
		clearDismissTimer();
		stopActiveStream();
	});

	// First submitted prompt: free the editor chrome. Honors MIN_DISPLAY_MS.
	pi.on("input", async (_event, ctx) => {
		scheduleDismiss(ctx);
	});

	pi.registerCommand("custom-header", {
		description:
			"Show the sticky Π art above the editor (restarts π digit stream)",
		handler: async (_args, ctx) => {
			applyCustomArt(ctx);
			if (ctx.hasUI) ctx.ui.notify("Custom Π art applied (sticky)", "info");
		},
	});

	pi.registerCommand("builtin-header", {
		description: "Dismiss the sticky Π art and restore the built-in header",
		handler: async (_args, ctx) => {
			if (ctx.mode !== "tui") return;
			dismissArt(ctx);
			ctx.ui.setHeader(undefined);
			if (ctx.hasUI) ctx.ui.notify("Built-in header restored", "info");
		},
	});
}
