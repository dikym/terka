import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildContent } from "../../../src/core/content/build";

const text = (path: string) => readFile(path, "utf8");
const sources = async () => ({
	curation: JSON.parse(await text("data/plate-curation.json")),
	specialCodes: JSON.parse(await text("data/Terka_Special_Codes.json")),
	funFacts: JSON.parse(await text("data/Terka_Fun_Facts.json")),
	today: "2026-10-02",
	previous: null as unknown
});
const errors = (messages: { level: string; code: string }[]) =>
	messages.filter((message) => message.level === "error");

describe("build from the real sources", () => {
	test("the build passes with the expected counts", async () => {
		const { bundle, messages } = buildContent({ ...(await sources()), release: false });
		expect(errors(messages)).toEqual([]);
		expect(bundle!.regions).toHaveLength(61);
		expect(bundle!.areas).toHaveLength(514);
		expect(bundle!.specials).toHaveLength(130);
		expect(
			bundle!.specials.filter((entry) => entry.needsReview).map((entry) => entry.number)
		).toEqual(["92"]);
		expect(bundle!.referencePlates.map((plate) => plate.series)).toEqual(["RI", "CC", "CH"]);
		expect(bundle!.facts).toHaveLength(41);
		expect(bundle!.facts.every((fact) => fact.publicationStatus === "ready")).toBe(true);
		expect(bundle!.contentRev).toBe(4);
		expect(bundle!.regions.find((region) => region.code === "DK")!.facts).toContain(
			"fact-bali-lombok-dk"
		);
	});
	test("a release build only fails on media sources that still lack originalUrl", async () => {
		const { messages } = buildContent({ ...(await sources()), release: true });
		expect(errors(messages).every((message) => message.code === "source-original-url")).toBe(
			true
		);
	});
	test("building twice gives identical JSON", async () => {
		const first = buildContent({ ...(await sources()), release: false });
		const second = buildContent({ ...(await sources()), release: false });
		expect(JSON.stringify(first.bundle)).toBe(JSON.stringify(second.bundle));
	});
	test("location names are written in full", async () => {
		const { bundle } = buildContent({ ...(await sources()), release: false });
		const names = bundle!.regions.map((region) => region.region).join(" | ");
		expect(names).not.toMatch(/\b(NTB|NTT|DIY|Nusra|Bosowasi)\b/);
		expect(bundle!.regions.some((region) => region.group === "bali-nusa-tenggara")).toBe(true);
	});
});
