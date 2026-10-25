import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import plates from "../../../src/data/plates.json";
import {
	diplomatList,
	refGroups,
	refView,
	regionDetail,
	suggestions
} from "../../../src/lib/view/reference";
import { stateOf } from "../../core/replay/fixtures";

const bundle = plates as Bundle;

describe("reference search", () => {
	test("each query opens the result it names", () => {
		expect(refView(bundle, "")).toEqual({ kind: "list" });
		expect(refView(bundle, " bk ")).toEqual({ kind: "region", code: "BK" });
		expect(refView(bundle, "CD 49 07")).toEqual({ kind: "special", number: "49" });
		expect(refView(bundle, "cd 4")).toEqual({ kind: "suggest", query: "cd 4" });
		expect(refView(bundle, "CC 12 10")).toEqual({ kind: "cc" });
		expect(refView(bundle, "RI 1")).toEqual({ kind: "ri" });
		expect(refView(bundle, "qwrty")).toEqual({ kind: "none", query: "qwrty" });
	});

	test("a diplomat number missing from the list finds nothing", () => {
		expect(refView(bundle, "CD 46")).toEqual({ kind: "none", query: "CD 46" });
	});

	test("a place name suggests the codes that use it", () => {
		expect(refView(bundle, "medan").kind).toBe("suggest");
		expect(suggestions(bundle, "medan").regions.map((row) => row.code)).toContain("BK");
	});

	test("a name search lists every code it found, not only the first few", () => {
		const jawa = bundle.regions.filter((region) => region.group === "jawa").length;
		expect(refView(bundle, "jawa").kind).toBe("suggest");
		expect(suggestions(bundle, "jawa").regions.length).toBeGreaterThanOrEqual(jawa);
	});

	test("a code found through one of its areas names that area", () => {
		const bl = suggestions(bundle, "timur").regions.find((row) => row.code === "BL")!;
		expect(bl.areas).toBe("Kabupaten Aceh Timur");
	});

	test("a full plate reads its front code", () => {
		expect(refView(bundle, "BK 1234 AB")).toEqual({ kind: "region", code: "BK" });
	});

	test("a diplomat prefix lists the numbers that start with it", () => {
		const result = suggestions(bundle, "CD 4");
		const fours = bundle.specials.filter((special) => special.number.startsWith("4"));
		expect(result.diplomats.map((entry) => entry.number)).toEqual(
			fours.map((special) => special.number).sort((a, b) => Number(a) - Number(b))
		);
		expect(result.diplomatTotal).toBe(result.diplomats.length);
	});
});

describe("reference details", () => {
	test("a region lists its cities before its regencies", () => {
		const detail = regionDetail(bundle, stateOf([], bundle), "BK", "2026-10-25");
		expect(detail.province).toBe("Sumatera Utara");
		expect(detail.kota.map((area) => area.name)).toContain("Medan");
		expect(detail.kabupaten.length).toBeGreaterThan(0);
		expect(detail.seen).toBeUndefined();
	});

	test("the region list puts a shared code under every province it spans", () => {
		const jawa = refGroups(bundle).find((group) => group.id === "jawa")!;
		const banten = jawa.provinces.find((province) => province.id === "banten")!;
		expect(banten.codes).toContain("B");
	});

	test("the diplomat list holds every number in order and nothing else", () => {
		const list = diplomatList(bundle);
		const numbers = list.entries.map((entry) => Number(entry.number));
		expect(numbers).toHaveLength(bundle.specials.length);
		expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
		expect(list.summary.entries).toBe(bundle.specials.length);
	});
});
