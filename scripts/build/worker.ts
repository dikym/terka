import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BunPlugin } from "bun";

const SRC = join(import.meta.dir, "../../src");
const aliases: BunPlugin = {
	name: "src-alias",
	setup(build) {
		build.onResolve({ filter: /^@\// }, (args) => ({
			path: Bun.resolveSync(`./${args.path.slice(2)}`, SRC)
		}));
	}
};

// Built here, not by Next: Turbopack's worker bootstrap reads its chunk list from the URL fragment,
// which a service-worker-served worker script loses, so the precached worker could never start.
export async function buildOptimizerWorker(outDir: string): Promise<string[]> {
	const result = await Bun.build({
		entrypoints: [join(SRC, "lib/optimizer/optimizer.worker.ts")],
		plugins: [aliases],
		target: "browser",
		format: "esm",
		minify: true
	});
	if (!result.success) return result.logs.map(String);
	await mkdir(join(outDir, "optimizer"), { recursive: true });
	await writeFile(join(outDir, "optimizer/worker.js"), await result.outputs[0].text());
	return [];
}
