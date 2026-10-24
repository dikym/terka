import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getManifest, injectManifest } from "workbox-build";
import { htmlPathOf, MAIN_ROUTES } from "./routes";

export const REQUIRED_ASSETS = [
	"plates.json",
	"map.svg",
	"optimizer/fsrs.wasm",
	"optimizer/worker.js",
	"manifest.webmanifest"
];

export const missingFromManifest = (urls: readonly string[]): string[] => {
	const present = new Set(urls);
	return [...MAIN_ROUTES.map(htmlPathOf), ...REQUIRED_ASSETS].filter((url) => !present.has(url));
};

const options = (outDir: string) => ({
	globDirectory: outDir,
	globPatterns: ["**/*.{html,js,css,json,wasm,svg,png,ico,txt,webmanifest}"],
	globIgnores: ["sw.js"],
	// Hashed file names already change with their content.
	dontCacheBustURLsMatching: /^_next\/static\//,
	maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
});

export async function buildServiceWorker(outDir: string): Promise<string[]> {
	const { manifestEntries, warnings } = await getManifest(options(outDir));
	const missing = missingFromManifest((manifestEntries ?? []).map((entry) => entry.url));
	if (missing.length > 0) return missing.map((url) => `${url} is not in the precache manifest`);
	const bundled = await Bun.build({
		entrypoints: [join(import.meta.dir, "../../src/sw/sw.ts")],
		target: "browser",
		minify: true
	});
	if (!bundled.success) return bundled.logs.map(String);
	const swSrc = join(tmpdir(), `terka-sw-${crypto.randomUUID()}.js`);
	await writeFile(swSrc, await bundled.outputs[0].text());
	try {
		const result = await injectManifest({ ...options(outDir), swSrc, swDest: join(outDir, "sw.js") });
		return [...warnings, ...result.warnings];
	} finally {
		await rm(swSrc, { force: true });
	}
}
