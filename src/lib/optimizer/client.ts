import { loadBundle } from "../content/load";
import { TerkaDb } from "../db/schema";
import { maybeOptimize, type Optimize } from "./run";

const TIMEOUT_MS = 10 * 60_000;

export function workerOptimize(): Optimize {
	return (input) =>
		new Promise((resolve, reject) => {
			// Bundled by scripts/build/worker.ts so the precached copy can start offline.
			const worker = new Worker("/optimizer/worker.js", { type: "module" });
			const finish = () => {
				clearTimeout(timer);
				worker.terminate();
			};
			const timer = setTimeout(() => {
				finish();
				reject(new Error("optimizer timed out"));
			}, TIMEOUT_MS);
			worker.onmessage = ({ data }) => {
				finish();
				if (data.ok) resolve({ draft: data.draft, steps: data.steps });
				else reject(new Error(data.reason));
			};
			worker.onerror = (event) => {
				finish();
				reject(new Error(event.message || "optimizer crashed"));
			};
			worker.postMessage(input);
		});
}

export async function optimizeInBackground(): Promise<void> {
	const content = await loadBundle();
	if (content.status !== "ok") return;
	await maybeOptimize(new TerkaDb(), content.bundle, {
		now: Date.now,
		optimize: workerOptimize()
	});
}
