import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkExport } from "../../scripts/build/export-check";
import { htmlPathOf, MAIN_ROUTES } from "../../scripts/build/routes";

let root = "";

async function put(path: string, text: string) {
	await mkdir(dirname(join(root, path)), { recursive: true });
	await writeFile(join(root, path), text);
}

async function completeTree() {
	root = await mkdtemp(join(tmpdir(), "terka-export-"));
	for (const route of MAIN_ROUTES) await put(`out/${htmlPathOf(route)}`, "<html></html>");
	await put("out/plates.json", JSON.stringify({ version: "2026.10.02", contentRev: 4 }));
	await put("src/app/page.tsx", "export default function Page() { return null; }");
}

const check = () => checkExport(join(root, "out"), join(root, "src/app"));

afterEach(() => rm(root, { recursive: true, force: true }));

describe("checkExport", () => {
	test("maps each route to its exported html file", () => {
		expect(htmlPathOf("/")).toBe("index.html");
		expect(htmlPathOf("/sesi")).toBe("sesi.html");
		expect(htmlPathOf("/auth/callback")).toBe("auth/callback.html");
		expect(MAIN_ROUTES).toContain("/privasi");
	});

	test("accepts a complete export", async () => {
		await completeTree();
		expect(await check()).toEqual([]);
	});

	test("names a main route whose page is missing", async () => {
		await completeTree();
		await rm(join(root, "out/sesi.html"));
		expect(await check()).toEqual([expect.stringContaining("/sesi")]);
	});

	test("refuses route handlers", async () => {
		await completeTree();
		await put("src/app/api/route.ts", "export function GET() {}");
		expect(await check()).toEqual([expect.stringContaining("api/route.ts")]);
	});

	test("refuses server actions", async () => {
		await completeTree();
		await put("src/app/actions.ts", '"use server";\nexport async function save() {}');
		expect(await check()).toEqual([expect.stringContaining("actions.ts")]);
	});

	test("refuses middleware and proxy files next to the app directory", async () => {
		await completeTree();
		await put("src/middleware.ts", "export function middleware() {}");
		await put("src/proxy.ts", "export function proxy() {}");
		expect(await check()).toEqual([
			expect.stringContaining("middleware.ts"),
			expect.stringContaining("proxy.ts")
		]);
	});

	test("refuses content without a dated version", async () => {
		await completeTree();
		await put("out/plates.json", JSON.stringify({ version: "draft", contentRev: 4 }));
		expect(await check()).toEqual([expect.stringContaining("plates.json")]);
	});

	test("refuses content without a revision", async () => {
		await completeTree();
		await put("out/plates.json", JSON.stringify({ version: "2026.10.02" }));
		expect(await check()).toEqual([expect.stringContaining("plates.json")]);
	});

	test("refuses a missing content file", async () => {
		await completeTree();
		await rm(join(root, "out/plates.json"));
		expect(await check()).toEqual([expect.stringContaining("plates.json")]);
	});
});
