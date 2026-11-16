/**
 * Classic sticky Π + unbounded π digit stream (Rabinowitz–Wagon BigInt spigot).
 */

import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import type { ArtFlavor, FlavorTui, FlavorWidget } from "./types.ts";

const DIGIT_INTERVAL_MS = 180;
const GLYPH_GAP = "  ";
const MAX_WINDOW_GLYPHS = 128;

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

class PiDisplayStream {
	private readonly spigot = new PiDigitSpigot();
	private phase: "ones" | "dot" | "frac" = "ones";
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

function composeScrollingBand(glyphs: string[][], maxWidth: number): string[] {
	if (glyphs.length === 0) return [];

	const padded = glyphs.map(padGlyph);
	const height = padded[0]!.length;
	const gap = GLYPH_GAP;

	const widthFrom = (from: number): number => {
		let w = 0;
		for (let i = from; i < padded.length; i++) {
			const gw = glyphWidth(padded[i]!);
			w = i === from ? gw : w + gap.length + gw;
		}
		return w;
	};

	const usable = Math.max(maxWidth, glyphWidth(padded[padded.length - 1]!));
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

function mountClassic(
	ctx: ExtensionContext,
	tui: FlavorTui,
	theme: Theme,
): FlavorWidget {
	const paint = (line: string) =>
		line.length === 0 ? line : theme.bold(theme.fg("accent", line));

	const stream = new PiDisplayStream();
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
		tui.requestRender();
	};

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
							`  · classic · paused at ${countLabel} digits · art stays until you send a message`,
						)
					: theme.fg(
							"dim",
							`  · classic · streaming π · ${countLabel} digits — type to stop`,
						));

			return [...art, subtitle];
		},
		invalidate() {},
		dispose() {
			stop();
		},
	};
}

export const classicFlavor: ArtFlavor = {
	id: "classic",
	label: "Classic Π stream",
	description: "Sticky block Π with unbounded π digit scroll",
	mount: mountClassic,
};
