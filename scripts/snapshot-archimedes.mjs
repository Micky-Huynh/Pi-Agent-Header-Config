/**
 * Offline snapshot of Archimedes scene (no pi peer required).
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scenePath = join(root, "extensions/lib/archimedes-scene.ts");

const { snapshotArchimedes } = await import(pathToFileURL(scenePath).href);

const frame = snapshotArchimedes(48, 0.0);
if (!frame.includes("Archimedes")) {
	console.error("snapshot missing Archimedes HUD");
	process.exit(1);
}
// Side count: inner/outer ("3/4") + "sides" under it (triangle inside, square outside).
if (!frame.includes("3/4") || !frame.includes("sides")) {
	console.error("snapshot at t=0 should show 3/4 sides (inner △ / outer □), got:\n", frame);
	process.exit(1);
}
if (!frame.includes("<  π  <")) {
	console.error("snapshot missing trap inequality, got:\n", frame);
	process.exit(1);
}
const artLines = frame.split("\n").slice(0, 12).join("");
if (!/[\u2800-\u28FF]/.test(artLines)) {
	console.error("snapshot missing braille glyphs");
	process.exit(1);
}
console.log("OK archimedes snapshot");
console.log(frame.split("\n").slice(0, 5).join("\n") + "\n...");
