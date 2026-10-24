import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildOptimizerWorker } from "../../scripts/build/worker";

let out = "";
afterEach(() => rm(out, { recursive: true, force: true }));

test("bundles the optimizer worker into one module with a plain url", async () => {
	out = await mkdtemp(join(tmpdir(), "terka-worker-"));
	expect(await buildOptimizerWorker(out)).toEqual([]);
	const worker = await readFile(join(out, "optimizer/worker.js"), "utf8");
	expect(worker).toContain("/optimizer/fsrs.wasm");
	expect(worker).not.toMatch(/\bimport\s*\(\s*["']\.\//);
}, 30_000);
