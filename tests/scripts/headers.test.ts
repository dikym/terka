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
	test("pages cannot be framed", () => {
		expect(headerOf("/(.*)", "Content-Security-Policy")).toBe("frame-ancestors 'none'");
	});

	test("pages are not sniffed and the service worker is always revalidated", () => {
		expect(headerOf("/(.*)", "X-Content-Type-Options")).toBe("nosniff");
		expect(headerOf("/(.*)", "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
		expect(headerOf("/sw.js", "Cache-Control")).toBe("no-cache");
	});
});
