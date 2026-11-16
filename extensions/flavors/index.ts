import { archimedesFlavor } from "./archimedes.ts";
import { classicFlavor } from "./classic.ts";
import type { ArtFlavor } from "./types.ts";

/** Register new sticky-art flavors here. */
export const FLAVORS: readonly ArtFlavor[] = [
	classicFlavor,
	archimedesFlavor,
];

export const DEFAULT_FLAVOR_ID = classicFlavor.id;

const byId = new Map(FLAVORS.map((f) => [f.id, f]));

export function getFlavor(id: string | undefined | null): ArtFlavor {
	if (id && byId.has(id)) return byId.get(id)!;
	return byId.get(DEFAULT_FLAVOR_ID)!;
}

export function listFlavors(): ArtFlavor[] {
	return [...FLAVORS];
}

export function isFlavorId(id: string): boolean {
	return byId.has(id);
}

export type { ArtFlavor } from "./types.ts";
