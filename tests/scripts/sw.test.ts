import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { htmlPathOf, MAIN_ROUTES } from "../../scripts/build/routes";
import { buildServiceWorker, missingFromManifest, REQUIRED_ASSETS } from "../../scripts/build/sw";

const complete = [...MAIN_ROUTES.map(htmlPathOf), ...REQUIRED_ASSETS];

describe("missingFromManifest", () => {
	test("accepts a manifest with every main page and required asset", () => {
		expect(missingFromManifest(complete)).toEqual([]);
	});

	test("names a missing main page", () => {
		expect(missingFromManifest(complete.filter((url) => url !== "sesi.html"))).toEqual([
			"sesi.html"
		]);
	});

	test("names the optimizer WebAssembly when it is missing", () => {
		expect(
			missingFromManifest(complete.filter((url) => url !== "optimizer/fsrs.wasm"))
		).toEqual(["optimizer/fsrs.wasm"]);
	});

	test("requires the content, the map and the optimizer", () => {
		expect(REQUIRED_ASSETS).toEqual([
			"plates.json",
			"map.svg",
			"optimizer/fsrs.wasm",
			"optimizer/worker.js",
			"manifest.webmanifest"
		]);
	});
});

describe("buildServiceWorker", () => {
	let out = "";
	afterEach(() => rm(out, { recursive: true, force: true }));

	async function tree(files: string[]) {
		out = await mkdtemp(join(tmpdir(), "terka-sw-"));
		for (const file of files) {
			await mkdir(dirname(join(out, file)), { recursive: true });
			await writeFile(join(out, file), file);
		}
	}

	test("writes a worker that precaches every file of the export", async () => {
		await tree([...complete, "_next/static/chunks/app.js"]);
		expect(await buildServiceWorker(out)).toEqual([]);
		const sw = await readFile(join(out, "sw.js"), "utf8");
		for (const url of [...complete, "_next/static/chunks/app.js"]) expect(sw).toContain(url);
		expect(sw).not.toContain("self.__WB_MANIFEST");
	}, 30_000);

	test("precaches the self-hosted fonts so text keeps its face offline", async () => {
		const font = "_next/static/media/space-grotesk.woff2";
		await tree([...complete, font]);
		expect(await buildServiceWorker(out)).toEqual([]);
		expect(await readFile(join(out, "sw.js"), "utf8")).toContain(font);
	}, 30_000);

	test("fails without writing when a main page is missing", async () => {
		await tree(complete.filter((url) => url !== "tentang.html"));
		expect(await buildServiceWorker(out)).toEqual([
			"tentang.html is not in the precache manifest"
		]);
	}, 30_000);
});
