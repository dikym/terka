import { describe, expect, test } from "bun:test";
import { identityRules } from "../../../src/core/content/rules/identity";
import { placementRules } from "../../../src/core/content/rules/placement";
import { exclusiveProvinces } from "../../../src/core/content/rules/provinces";
import { regionRules } from "../../../src/core/content/rules/regions";
import { errorCodes, validDraft } from "./fixtures";

const all = (draft = validDraft()) => [
	...identityRules(draft),
	...regionRules(draft),
	...placementRules(draft)
];

describe("identity, region and placement rules", () => {
	test("the valid draft has no errors", () => {
		expect(errorCodes(all())).toEqual([]);
	});
	test("TR-06: two regions with the same id fail", () => {
		const draft = validDraft();
		draft.curation.regions[1].id = "aa";
		expect(errorCodes(all(draft))).toContain("duplicate-id");
	});
	test("TR-05: a retired id cannot be reused", () => {
		const draft = validDraft();
		draft.curation.retiredIds = ["ab"];
		expect(errorCodes(identityRules(draft))).toContain("retired-id");
	});
	test("TR-170: a region id shaped like a special fails", () => {
		const draft = validDraft();
		draft.curation.regions[0].id = "cd-12";
		expect(errorCodes(identityRules(draft))).toContain("region-special-prefix");
	});
	test("TR-169: a special id equal to a region id fails", () => {
		const draft = validDraft();
		draft.specials.specials[1].id = "ab";
		expect(errorCodes(identityRules(draft))).toContain("special-region-collision");
	});
	test("TR-176: a ref- id inside specials fails", () => {
		const draft = validDraft();
		draft.specials.specials[1].id = "ref-cd-13";
		expect(errorCodes(identityRules(draft))).toContain("reference-in-specials");
	});
	test("TR-07: a region in an unknown group fails", () => {
		const draft = validDraft();
		draft.curation.regions[0].group = "atlantis";
		expect(errorCodes(regionRules(draft))).toContain("unknown-group");
	});
	test("TR-79: a membership pointing at a missing area fails", () => {
		const draft = validDraft();
		draft.curation.regions[0].areas.push({ areaId: "kab-zz", confidence: "high" });
		expect(errorCodes(regionRules(draft))).toContain("unknown-area");
	});
	test("an area no code uses fails", () => {
		const draft = validDraft();
		draft.curation.areas.push({
			...draft.curation.areas[0],
			id: "kab-sendiri",
			name: "Sendiri"
		});
		expect(errorCodes(regionRules(draft))).toContain("orphan-area");
	});
	test("TR-81: a variant equal to another area's name without spaces fails and names both ids", () => {
		const draft = validDraft();
		draft.curation.areas[0].variants = ["Daerahab"];
		const messages = regionRules(draft).filter(
			(message) => message.code === "area-form-collision"
		);
		expect(messages).toHaveLength(1);
		expect(messages[0].message).toContain("kab-aa");
		expect(messages[0].message).toContain("kab-ab");
	});
	test("TR-82: a kota and a kabupaten with the same name are reported, not rejected", () => {
		const draft = validDraft();
		draft.curation.areas[1] = { ...draft.curation.areas[1], type: "kota", name: "Daerah aa" };
		const messages = regionRules(draft);
		expect(errorCodes(messages)).toEqual([]);
		expect(messages.some((message) => message.code === "same-name")).toBe(true);
	});
	test("a reference-only series cannot be a region", () => {
		const draft = validDraft();
		draft.curation.regions[0].code = "CD";
		expect(errorCodes(regionRules(draft))).toContain("reference-series");
	});
	test("a province in two groups fails", () => {
		const draft = validDraft();
		draft.curation.groups.push({ id: "island-b", name: "Pulau B" });
		draft.curation.regions[1].province = "province-aa";
		draft.curation.regions[1].group = "island-b";
		expect(errorCodes(regionRules(draft))).toContain("province-groups");
	});
	test("a high region needs an official source, two publishers and no issues", () => {
		const draft = validDraft();
		draft.curation.regions[0].sources = draft.curation.regions[0].sources.slice(1);
		draft.curation.regions[1].issues = ["dua tanggal berbeda"];
		const messages = regionRules(draft).filter((message) => message.code === "region-evidence");
		expect(messages.map((message) => message.message.split(":")[0])).toEqual(["aa", "ab"]);
	});
	test("a non-high region is a warning", () => {
		const draft = validDraft();
		draft.curation.regions[0].confidence = "medium";
		expect(regionRules(draft).some((message) => message.level === "warning")).toBe(true);
	});
	test("TR-84: fewer than 8 common codes fails", () => {
		const draft = validDraft();
		draft.curation.regions[0].placementTier = "rare";
		expect(errorCodes(placementRules(draft))).toContain("placement-tier-size");
	});
	test("TR-83: a code using every area of its province exclusively is found", () => {
		const draft = validDraft();
		const bundle = {
			regions: draft.curation.regions.map(
				({ sources: _sources, issues: _issues, ...region }) => ({
					...region,
					facts: []
				})
			),
			areas: draft.curation.areas
		};
		expect(exclusiveProvinces(bundle).get("aa")).toBe("province-aa");
		bundle.regions[1].areas.push({ areaId: "kab-aa", confidence: "high" });
		expect(exclusiveProvinces(bundle).has("aa")).toBe(false);
	});
});
