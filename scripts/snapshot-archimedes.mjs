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
// Side count is centered as "3" / "sides" on separate rows (graphic style).
if (!/\b3\b/.test(frame) || !frame.includes("sides")) {
	console.error("snapshot at t=0 should show triangle (3 / sides), got:\n", frame);
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
