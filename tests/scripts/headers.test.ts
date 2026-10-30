import { describe, expect, test } from "bun:test";

type Rule = { source: string; headers: { key: string; value: string }[] };
const config: { headers: Rule[] } = await Bun.file(
	new URL("../../vercel.json", import.meta.url)
).json();
const headerOf = (source: string, key: string) =>
	config.headers
		.find((rule) => rule.source === source)
		?.headers.find((header) => header.key === key)?.value;

describe("static site headers", () => {
	const csp = headerOf("/(.*)", "Content-Security-Policy") ?? "";

	test("every page gets a content security policy", () => {
		expect(csp).toContain("default-src 'self'");
		expect(csp).toContain("frame-ancestors 'none'");
		expect(csp).toContain("object-src 'none'");
	});

	test("the policy lets the optimizer compile WebAssembly", () => {
		expect(csp).toMatch(/script-src [^;]*'wasm-unsafe-eval'/);
	});

	test("the policy allows the sync server, its realtime socket and the email captcha", () => {
		expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.supabase\.co/);
		expect(csp).toMatch(/connect-src [^;]*wss:\/\/\*\.supabase\.co/);
		expect(csp).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
		expect(csp).toMatch(/frame-src [^;]*https:\/\/challenges\.cloudflare\.com/);
	});

	test("pages are not sniffed and the service worker is always revalidated", () => {
		expect(headerOf("/(.*)", "X-Content-Type-Options")).toBe("nosniff");
		expect(headerOf("/(.*)", "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
		expect(headerOf("/sw.js", "Cache-Control")).toBe("no-cache");
	});
});
