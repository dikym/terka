import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import plates from "../../../src/data/plates.json";
import {
	diplomatList,
	provinceResults,
	referenceHref,
	refGroups,
	refView,
	regionDetail,
	searchResults,
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

	test("a suggestion row names at most two areas, however it was found", () => {
		const bd = suggestions(bundle, "bengkulu").regions.find((row) => row.code === "BD")!;
		expect(bd.areas).toBe("Kota Bengkulu, Kabupaten Bengkulu Utara, dan 2 lainnya");
		const bk = suggestions(bundle, "timur").regions.find((row) => row.code === "BK")!;
		expect(bk.areas).toMatch(/^Kota Medan, Kota Binjai, dan \d+ lainnya$/);
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

describe("reference results", () => {
	test("a name search lists every matching code, in suggestion order", () => {
		const codes = searchResults(bundle, "timur").regions.map((row) => row.code);
		expect(codes).toEqual(suggestions(bundle, "timur").regions.map((row) => row.code));
		expect(searchResults(bundle, "malang").regions.map((row) => row.code)).toEqual(["N"]);
	});

	test("a code found through its areas shows only those areas", () => {
		const bl = searchResults(bundle, "timur").regions.find((row) => row.code === "BL")!;
		const detail = regionDetail(bundle, stateOf([], bundle), "BL", "2026-10-25", bl.areaIds);
		expect([...detail.kota, ...detail.kabupaten].map((area) => area.name)).toEqual([
			"Aceh Timur"
		]);
		expect(detail.note).toMatch(/^1 dari \d+ kab\/kota kode BL cocok dengan pencarian\.$/);
		const n = searchResults(bundle, "malang").regions[0];
		const malang = regionDetail(bundle, stateOf([], bundle), "N", "2026-10-25", n.areaIds);
		for (const area of [...malang.kota, ...malang.kabupaten])
			expect(area.name).toContain("Malang");
	});

	test("a code found through one of its names says which", () => {
		const timur = searchResults(bundle, "timur").regions;
		expect(timur.find((row) => row.code === "BK")!.note).toBe(
			"Kode BK diperuntukkan untuk Sumatera Utara bagian Timur."
		);
		expect(timur.find((row) => row.code === "L")!.note).toBe(
			"Cocok dengan provinsi Jawa Timur, jadi semua kab/kota ditampilkan."
		);
		expect(timur.find((row) => row.code === "BL")!.note).toBeNull();
	});

	test("a code's own name outranks one of its areas", () => {
		// BB is "Sumatera Utara bagian Barat" and also holds Nias Barat.
		const bb = searchResults(bundle, "barat").regions.find((row) => row.code === "BB")!;
		expect(bb.areaIds).toEqual([]);
		expect(bb.note).toBe("Kode BB diperuntukkan untuk Sumatera Utara bagian Barat (Tapanuli).");
	});

	test("a code name that lists the matched area still shows only that area", () => {
		// H is named "Semarang", which is also one of its areas.
		const h = searchResults(bundle, "semarang").regions.find((row) => row.code === "H")!;
		expect(h.areaIds.length).toBeGreaterThan(0);
		expect(h.note).toBeNull();
	});

	test("a code found through its province shows all its areas", () => {
		const l = searchResults(bundle, "jawa timur").regions.find((row) => row.code === "L")!;
		expect(l.areaIds).toEqual([]);
		const detail = regionDetail(bundle, stateOf([], bundle), "L", "2026-10-25", l.areaIds);
		expect(detail.note).toBeUndefined();
	});

	test("a diplomat name search lists the diplomats too", () => {
		expect(searchResults(bundle, "jepang").diplomats.length).toBeGreaterThan(0);
	});

	test("a province filter keeps only that province's codes", () => {
		const result = provinceResults(bundle, "riau")!;
		const codes = result.regions.map((row) => row.code);
		expect(result.name).toBe("Riau");
		expect(codes).toContain("BM");
		expect(codes).not.toContain("BP");
		expect(result.regions.every((row) => row.areaIds.length === 0)).toBe(true);
		expect(provinceResults(bundle, "xyz")).toBeNull();
	});

	test("reference links encode their value", () => {
		expect(referenceHref("kode", "CD 12")).toBe("/referensi?kode=CD%2012");
		expect(referenceHref("kawasan", "jawa")).toBe("/referensi?kawasan=jawa");
	});
});
