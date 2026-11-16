import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

/** Sticky widget handle returned by a flavor mount. */
export type FlavorWidget = {
	render(width: number): string[];
	invalidate(): void;
	dispose(): void;
};

/** Minimal TUI surface used by flavors (requestRender for animation). */
export type FlavorTui = {
	requestRender(): void;
};

/**
 * A selectable sticky-art flavor.
 * Add new artwork by implementing this and registering in flavors/index.ts.
 */
export type ArtFlavor = {
	id: string;
	label: string;
	description: string;
	mount(
		ctx: ExtensionContext,
		tui: FlavorTui,
		theme: Theme,
	): FlavorWidget;
};
