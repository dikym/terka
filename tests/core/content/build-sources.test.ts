import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildContent } from "../../../src/core/content/build";

const sources = async () => ({
	curation: JSON.parse(await readFile("data/plate-curation.json", "utf8")),
	specialsMarkdown: await readFile("docs/Terka_Kode_Khusus.md", "utf8"),
	factsMarkdown: await readFile("docs/Terka_Facts.md", "utf8"),
	today: "2026-09-28",
	previous: null as unknown
});

describe("build from the real sources", () => {
	test("the release build passes with the expected counts", async () => {
		const { bundle, messages } = buildContent({ ...(await sources()), release: true });
		expect(messages.filter((message) => message.level === "error")).toEqual([]);
		expect(bundle!.regions).toHaveLength(61);
		expect(bundle!.areas).toHaveLength(514);
		expect(bundle!.specials).toHaveLength(130);
		expect(bundle!.facts).toHaveLength(50);
		expect(bundle!.contentRev).toBe(3);
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
