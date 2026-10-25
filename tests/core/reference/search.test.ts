import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { searchReference } from "../../../src/core/reference/search";
import { sightingEvent } from "../../../src/core/session/commands";
import { ruleBundle } from "../rules/fixtures";
import { ctxAt } from "../session/fixtures";
import { NOW } from "../replay/fixtures";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const search = (query: string) => searchReference(plates, query);

describe("front codes", () => {
	test("opens a region from its code in any case or spacing", () => {
		for (const query of ["DR", "dr", " DR "])
			expect(search(query)).toMatchObject({ kind: "region", region: { id: "dr" } });
	});

	test("reads only the front code of a full plate", () => {
		for (const query of [" DK 1234 ABC ", "dk-1234-abc", "DK1234"])
			expect(search(query)).toMatchObject({ kind: "region", region: { id: "dk" } });
	});

	test("prefers a code over a name that starts with it", () => {
		expect(search("BA")).toMatchObject({ kind: "region", region: { id: "ba" } });
	});

	test("finds nothing for an unknown code", () => {
		expect(search("XQ")).toEqual({ kind: "none", query: "XQ" });
	});

	test("treats blank input as empty", () => {
		expect(search("  ")).toEqual({ kind: "empty" });
	});

	test("lists every membership with its confidence and says whether the code is trained", () => {
		const bundle = ruleBundle();
		const result = searchReference(bundle, "BK");
		if (result.kind !== "region") throw new Error("expected a region");
		expect(result.areas.find((item) => item.area.id === "kab-langkat")?.confidence).toBe(
			"medium"
		);
		expect(result.trainable).toBe(true);
		bundle.regions.find((region) => region.id === "bk")!.confidence = "medium";
		expect(searchReference(bundle, "BK")).toMatchObject({ kind: "region", trainable: false });
	});
});

describe("plates without a region", () => {
	test("opens a CD entry from its country code and drops the registration number", () => {
		for (const query of ["CD 49", "cd49", "CD 49 07", "CD 049", "cd-49"]) {
			const result = search(query);
			expect(result).toMatchObject({ kind: "special", special: { id: "cd-49-jepang" } });
			if (result.kind === "special")
				expect(result.sources.map((source) => source.id)).toEqual([
					"perpol-7-2021-lampiran"
				]);
		}
	});

	test("finds nothing for a CD number missing from the list", () => {
		expect(search("CD 46")).toEqual({ kind: "none", query: "CD 46" });
	});

	test("opens the CD list for the bare series", () => {
		expect(search("CD")).toEqual({ kind: "specialList" });
	});

	test("opens the same RI format entry with or without a number", () => {
		for (const query of ["RI", "RI 1", "ri 20"])
			expect(search(query)).toMatchObject({ kind: "reference", plate: { id: "ref-ri" } });
	});

	test("opens the CC and CH format entries", () => {
		expect(search("CC 12 10")).toMatchObject({ kind: "reference", plate: { id: "ref-cc" } });
		expect(search("CH")).toMatchObject({ kind: "reference", plate: { id: "ref-ch" } });
	});
});

describe("names", () => {
	test("finds every area whose name starts with a word", () => {
		const result = search("Lombok");
		expect(result.kind).toBe("names");
		if (result.kind !== "names") return;
		expect(result.regions.map((hit) => hit.region.id)).toEqual(["dr"]);
		expect(result.regions[0].areas.map((area) => area.id)).toEqual([
			"kab-lombok-barat",
			"kab-lombok-tengah",
			"kab-lombok-timur",
			"kab-lombok-utara"
		]);
	});

	test("ignores the administrative prefix and punctuation", () => {
		const result = search("Kab. Lombok Timur");
		expect(result).toMatchObject({ kind: "names", regions: [{ region: { id: "dr" } }] });
		if (result.kind === "names")
			expect(result.regions[0].areas.map((area) => area.id)).toEqual(["kab-lombok-timur"]);
	});

	test("finds a code from its region name", () => {
		const result = search("Bali");
		expect(
			result.kind === "names" && result.regions.some((hit) => hit.region.id === "dk")
		).toBe(true);
	});

	test("finds a diplomatic code from its holder or alias", () => {
		for (const query of ["Jepang", "Japan", "kedubes jepang"])
			expect(search(query)).toMatchObject({
				kind: "names",
				specials: [{ id: "cd-49-jepang" }]
			});
	});

	test("finds every code of a group from its name", () => {
		const result = search("jawa");
		const codes = result.kind === "names" ? result.regions.map((hit) => hit.region.id) : [];
		const jawa = plates.regions.filter((region) => region.group === "jawa").map((r) => r.id);
		expect(codes).toEqual(expect.arrayContaining(jawa));
	});

	test("a word that only starts a group name does not open the whole group", () => {
		const result = search("bali");
		const codes = result.kind === "names" ? result.regions.map((hit) => hit.region.id) : [];
		expect(codes).toEqual(["dk", "kt"]);
	});

	test("a group's full name opens every code in it", () => {
		const result = search("Bali & Nusa Tenggara");
		const codes = result.kind === "names" ? result.regions.map((hit) => hit.region.id) : [];
		const group = plates.regions
			.filter((region) => region.group === "bali-nusa-tenggara")
			.map((region) => region.id);
		expect(codes).toEqual(group);
	});

	test("finds every code of a province from its full name", () => {
		const result = search("Jawa Timur");
		const codes = result.kind === "names" ? result.regions.map((hit) => hit.region.id) : [];
		const timur = plates.regions
			.filter((region) => region.province === "jawa-timur")
			.map((region) => region.id);
		expect(timur.length).toBeGreaterThan(0);
		expect(codes).toEqual(timur);
	});

	test("a compass word finds provinces, regions and areas named with it", () => {
		const result = search("timur");
		const codes = result.kind === "names" ? result.regions.map((hit) => hit.region.id) : [];
		for (const province of ["jawa-timur", "kalimantan-timur", "nusa-tenggara-timur"])
			for (const region of plates.regions.filter((item) => item.province === province))
				expect(codes).toContain(region.id);
		// Lombok Timur is a regency of DR, in Nusa Tenggara Barat.
		expect(codes).toContain("dr");
	});

	test("reports a name that matches nothing", () => {
		expect(search("Atlantis")).toEqual({ kind: "none", query: "Atlantis" });
	});
});

test("records a sighting exactly for the searches that open a region", () => {
	const inputs = [
		"DR",
		" DK 1234 ABC ",
		"dk-1234-abc",
		"BA",
		"XQ",
		"CD 49",
		"CD",
		"RI 1",
		"CC 12 10",
		"Lombok",
		"Bali",
		"Jepang",
		""
	];
	for (const input of inputs) {
		const recorded = sightingEvent(input, plates, ctxAt(NOW), null) !== null;
		expect([input, recorded]).toEqual([input, search(input).kind === "region"]);
	}
});
