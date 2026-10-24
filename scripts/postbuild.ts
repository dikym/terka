import { copyFile, mkdir } from "node:fs/promises";
import { checkExport } from "./build/export-check";
import { buildServiceWorker } from "./build/sw";
import { buildOptimizerWorker } from "./build/worker";

const steps: [string, () => Promise<string[]>][] = [
	[
		"copy assets",
		async () => {
			await copyFile("src/data/plates.json", "out/plates.json");
			await mkdir("out/optimizer", { recursive: true });
			await copyFile(
				"node_modules/@open-spaced-repetition/binding-wasm32-wasip1/fsrs-binding.wasm32-wasip1.wasm",
				"out/optimizer/fsrs.wasm"
			);
			return [];
		}
	],
	["check export", () => checkExport("out", "src/app")],
	["optimizer worker", () => buildOptimizerWorker("out")],
	["service worker", () => buildServiceWorker("out")]
];

for (const [name, step] of steps) {
	const problems = await step();
	if (problems.length > 0) {
		for (const problem of problems) console.error(`${name}: ${problem}`);
		process.exit(1);
	}
	console.log(`${name}: ok`);
}
