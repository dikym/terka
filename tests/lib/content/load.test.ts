import { describe, expect, test } from "bun:test";
import { loadBundle } from "../../../src/lib/content/load";

const platesText = await Bun.file(new URL("../../../src/data/plates.json", import.meta.url)).text();
const respond = (body: string, status = 200) =>
	(async () => new Response(body, { status })) as unknown as typeof fetch;

describe("loadBundle", () => {
	test("returns the shipped content", async () => {
		const result = await loadBundle(respond(platesText));
		expect(result.status).toBe("ok");
		if (result.status === "ok")
			expect(result.bundle.contentRev).toBe(JSON.parse(platesText).contentRev);
	});

	test("fails when the file is not served", async () => {
		expect(await loadBundle(respond("not found", 404))).toEqual({ status: "failed" });
	});

	test("fails on a broken file", async () => {
		expect(await loadBundle(respond("{"))).toEqual({ status: "failed" });
	});

	test("fails on content that does not match the schema", async () => {
		expect(await loadBundle(respond(JSON.stringify({ version: "2026.10.02" })))).toEqual({
			status: "failed"
		});
	});

	test("fails when the network is down", async () => {
		const offline = (async () => {
			throw new TypeError("Failed to fetch");
		}) as unknown as typeof fetch;
		expect(await loadBundle(offline)).toEqual({ status: "failed" });
	});
});
