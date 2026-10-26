import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildDictionary, highMembers, provinceName } from "../../../src/core/answers/dictionary";
import { matchName } from "../../../src/core/answers/match-name";
import { typoDistance } from "../../../src/core/answers/typo";
import { typoThreshold } from "../../../src/rules";
import { bundleSchema } from "../../../src/core/content/schema";
import { compactName } from "../../../src/core/text";
import { ruleBundle } from "./fixtures";

const dictionary = buildDictionary(ruleBundle());
const match = (input: string, codeId: string) => matchName(input, codeId, dictionary);

describe("typo distance", () => {
	test("weighted costs and thresholds", () => {
		expect(typoDistance("mdean", "medan")).toBe(0.5);
		expect(typoDistance("medsn", "medan")).toBe(0.5);
		expect(typoDistance("tebingtingi", "tebingtinggi")).toBe(0.5);
		expect(typoDistance("pekanbru", "pekanbaru")).toBe(1);
		expect([4, 5, 7, 8, 11, 12].map(typoThreshold)).toEqual([0, 1, 1, 1.5, 1.5, 2]);
	});
});

describe("region name matching", () => {
	test("province names are formed from ids in title case", () => {
		expect(provinceName("kepulauan-riau")).toBe("Kepulauan Riau");
	});
	test("normalized, spaced, aliased and prefixed forms are exact", () => {
		expect(match("Kab. Deli Serdang", "bk").matchType).toBe("exact");
		expect(match("  MEDAN!! ", "bk")).toMatchObject({
			matchType: "exact",
			acceptedAreaId: "kota-medan"
		});
		expect(match("Jogja", "ab").matchType).toBe("exact");
		expect(match("Bukit Tinggi", "ba")).toMatchObject({
			matchType: "exact",
			correction: "Kota Bukittinggi"
		});
		expect(match("Pematang Siantar", "bk").matchType).toBe("exact");
		expect(match("Kotamobagu", "db").matchType).toBe("exact");
	});
	test("old spellings and registered variants are variant matches", () => {
		expect(match("Djember", "p").matchType).toBe("variant");
		expect(match("Tjilatjap", "r").matchType).toBe("variant");
		expect(match("Binjay", "bk").matchType).toBe("variant");
	});
	test("typos within the threshold are accepted with their cost", () => {
		expect(match("Pekanbaur", "bm")).toMatchObject({ matchType: "typo", typoCost: 0.5 });
		expect(match("Pekanbru", "bm")).toMatchObject({ matchType: "typo", typoCost: 1 });
		expect(match("Mdean", "bk")).toMatchObject({ matchType: "typo", typoCost: 0.5 });
		expect(match("Medsn", "bk")).toMatchObject({ matchType: "typo", typoCost: 0.5 });
		expect(match("Tebingtingi", "bk")).toMatchObject({ matchType: "typo", typoCost: 0.5 });
	});
	test("four-letter names and a changed first letter get no tolerance", () => {
		expect(match("Bim", "ea").matchType).toBe("none");
		expect(match("Vengkulu", "bd").matchType).toBe("none");
	});
	test("a name of another code is wrong and records the pair", () => {
		expect(match("Bandar Lampung", "bd")).toMatchObject({
			matchType: "none",
			confusedWith: "be"
		});
	});
	test("an area used by two codes is accepted for both", () => {
		expect(match("Tangerang", "a").matchType).toBe("exact");
		expect(match("Tangerang", "b").matchType).toBe("exact");
	});
	test("a medium membership is not graded", () => {
		expect(match("Langkat", "bk").matchType).toBe("unverified");
	});
	test("province names count only when exclusive", () => {
		expect(match("Sumatera Utara", "bk")).toMatchObject({
			matchType: "none",
			confusedWith: null
		});
		expect(match("Bali", "dk").matchType).toBe("exact");
		expect(match("Kepulauan Riau", "bm")).toMatchObject({
			matchType: "none",
			confusedWith: "bp"
		});
		expect(matchName("Bali", "dk", dictionary, { allowProvince: false }).matchType).toBe(
			"none"
		);
	});
	test("a bare kota/kabupaten twin is accepted; an explicit prefix picks one", () => {
		expect(match("Bima", "ea")).toMatchObject({ matchType: "exact", ambiguous: true });
		expect(match("Kota Bima", "ea")).toMatchObject({
			matchType: "exact",
			acceptedAreaId: "kota-bima",
			ambiguous: false
		});
		expect(match("Kabupaten Bima", "ea").acceptedAreaId).toBe("kab-bima");
	});
	test("an administrative prefix only picks among accepted hits, it does not filter the dictionary", () => {
		expect(match("Kabupaten Medan", "bk")).toMatchObject({
			matchType: "exact",
			acceptedAreaId: "kota-medan"
		});
		expect(match("Kota Langkat", "bk").matchType).toBe("unverified");
	});
	test("a typo of a medium membership is unverified, not typo", () => {
		expect(match("Langkst", "bk").matchType).toBe("unverified");
	});
	test("a typo must beat every other name by at least one", () => {
		const bundle = ruleBundle();
		bundle.regions.push(
			{
				...bundle.regions[0],
				id: "sa",
				code: "SA",
				province: "aceh",
				areas: [{ areaId: "kota-sabang", confidence: "high" }]
			},
			{
				...bundle.regions[0],
				id: "sk",
				code: "SK",
				province: "aceh",
				areas: [{ areaId: "kota-sabank", confidence: "high" }]
			}
		);
		bundle.areas.push(
			{
				id: "kota-sabang",
				type: "kota",
				name: "Sabang",
				province: "aceh",
				aliases: [],
				variants: [],
				popularity: 3
			},
			{
				id: "kota-sabank",
				type: "kota",
				name: "Sabank",
				province: "aceh",
				aliases: [],
				variants: [],
				popularity: 3
			}
		);
		const crowded = matchName("Sabanh", "sa", buildDictionary(bundle));
		expect(crowded).toMatchObject({
			matchType: "none",
			confusedWith: null,
			ambiguous: false,
			tooClose: true
		});
		bundle.regions.pop();
		bundle.areas.pop();
		expect(matchName("Sabanh", "sa", buildDictionary(bundle)).matchType).toBe("typo");
	});
	test("typo uniqueness scores every dictionary form, not only ones sharing the first letter", () => {
		const bundle = ruleBundle();
		bundle.regions.push(
			{
				...bundle.regions[0],
				id: "xx",
				code: "XX",
				province: "aceh",
				areas: [{ areaId: "kota-nedanx", confidence: "high" }]
			},
			{
				...bundle.regions[0],
				id: "yy",
				code: "YY",
				province: "aceh",
				areas: [{ areaId: "kota-medanx", confidence: "high" }]
			}
		);
		bundle.areas.push(
			{
				id: "kota-nedanx",
				type: "kota",
				name: "Nedanx",
				province: "aceh",
				aliases: [],
				variants: [],
				popularity: 3
			},
			{
				id: "kota-medanx",
				type: "kota",
				name: "Medanx",
				province: "aceh",
				aliases: [],
				variants: [],
				popularity: 3
			}
		);
		// "Medanz" is a clean 0.5 typo of Medanx (owned by yy), but Nedanx (a different code,
		// a different first letter) is only 1 away — within the uniqueness margin. A dictionary
		// prefiltered to the answer's first letter would never see Nedanx and would wrongly accept.
		expect(matchName("Medanz", "yy", buildDictionary(bundle)).matchType).toBe("none");
	});
	test("a typo of a kota/kabupaten twin is accepted; the twins never block each other", () => {
		const bundle = ruleBundle();
		bundle.areas.push({
			id: "kota-tangerang",
			type: "kota",
			name: "Tangerang",
			province: "banten",
			aliases: [],
			variants: [],
			popularity: 3
		});
		bundle.regions
			.find((region) => region.id === "b")!
			.areas.push({ areaId: "kota-tangerang", confidence: "high" });
		const twins = buildDictionary(bundle);
		expect(matchName("Tangrang", "a", twins)).toMatchObject({
			matchType: "typo",
			acceptedAreaId: "kab-tangerang",
			tooClose: false
		});
		expect(matchName("Tangrang", "b", twins)).toMatchObject({
			matchType: "typo",
			acceptedAreaId: "kab-tangerang",
			ambiguous: true
		});
		expect(matchName("Kota Tangrang", "b", twins)).toMatchObject({
			matchType: "typo",
			acceptedAreaId: "kota-tangerang",
			ambiguous: false
		});
	});
	test("a typo of an area name that is also an exclusive province name is accepted", () => {
		expect(match("Benkgulu", "bd")).toMatchObject({
			matchType: "typo",
			acceptedAreaId: "kota-bengkulu",
			typoCost: 0.5
		});
	});
	test("real content: swapping the 3rd and 4th letters of any 8+ letter member is a typo", async () => {
		const real = bundleSchema.parse(JSON.parse(await readFile("src/data/plates.json", "utf8")));
		const realDictionary = buildDictionary(real);
		const failures: string[] = [];
		for (const region of real.regions)
			for (const area of highMembers(real, region)) {
				const name = compactName(area.name);
				if (name.length < 8) continue;
				const swapped = name.slice(0, 2) + name[3] + name[2] + name.slice(4);
				const result = matchName(swapped, region.id, realDictionary).matchType;
				if (result !== (swapped === name ? "exact" : "typo"))
					failures.push(`${region.id} ${area.id} ${swapped}: ${result}`);
			}
		expect(failures).toEqual([]);
	});
	test("empty input matches nothing", () => {
		expect(match("   ", "bk").matchType).toBe("none");
	});
});
