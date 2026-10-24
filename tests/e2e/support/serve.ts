// Serves out/ the way the static host does: clean URLs, index.html at /, 404.html otherwise.
import { join, normalize } from "node:path";

const ROOT = join(import.meta.dir, "../../../out");
// The host's headers from vercel.json, so every E2E run sees the real CSP.
type Rule = { source: string; headers: { key: string; value: string }[] };
const RULES: { pattern: RegExp; headers: Rule["headers"] }[] = (
	(await Bun.file(join(import.meta.dir, "../../../vercel.json")).json()) as { headers: Rule[] }
).headers.map((rule) => ({
	pattern: new RegExp(`^${rule.source.replace(/\(\.\*\)/g, ".*")}$`),
	headers: rule.headers
}));

function withHeaders(pathname: string, response: Response): Response {
	for (const rule of RULES)
		if (rule.pattern.test(pathname))
			for (const header of rule.headers) response.headers.set(header.key, header.value);
	return response;
}
const PORT = Number(process.env.PORT ?? 4173);
let swVersion = 1;

async function file(path: string) {
	const candidate = Bun.file(join(ROOT, normalize(path)));
	return (await candidate.exists()) ? candidate : null;
}

Bun.serve({
	port: PORT,
	async fetch(request) {
		const { pathname } = new URL(request.url);
		return withHeaders(pathname, await respond(request));
	}
});

async function respond(request: Request): Promise<Response> {
	const { pathname, searchParams } = new URL(request.url);
	// Test control: change the worker's bytes so the browser sees a new version.
	if (pathname === "/__sw-version") {
		swVersion = Number(searchParams.get("v") ?? swVersion + 1);
		return new Response(String(swVersion));
	}
	if (pathname === "/sw.js") {
		const text = await Bun.file(join(ROOT, "sw.js")).text();
		return new Response(swVersion === 1 ? text : `${text}\n// version ${swVersion}`, {
			headers: { "content-type": "text/javascript", "cache-control": "no-cache" }
		});
	}
	const found =
		(pathname === "/" ? await file("index.html") : null) ??
		(pathname.endsWith("/") ? null : await file(pathname)) ??
		(await file(`${pathname}.html`));
	if (found && (await found.stat()).isFile()) return new Response(found);
	return new Response(Bun.file(join(ROOT, "404.html")), { status: 404 });
}
console.log(`serving out/ on http://localhost:${PORT}`);
