import { describe, expect, test } from "bun:test";
import { factRules } from "../../../src/core/content/rules/facts";
import { specialRules } from "../../../src/core/content/rules/specials";
import { errorCodes, validDraft } from "./fixtures";

const TODAY = "2026-09-28";

describe("fact rules", () => {
	test("the valid draft has no fact errors", () => {
		expect(errorCodes(factRules(validDraft()))).toEqual([]);
	});
	test("a document item without a curation entry fails, and vice versa", () => {
		const draft = validDraft();
		draft.facts.push({
			number: 2,
			line: 2,
			historyLabel: "legenda",
			publicationStatus: "draft",
			text: "Dua."
		});
		draft.curation.facts.push({ number: 3, id: "f-003", regions: [] });
		expect(errorCodes(factRules(draft)).sort()).toEqual([
			"entry-without-fact",
			"fact-without-entry"
		]);
	});
	test("a fact linked to an unknown region fails", () => {
		const draft = validDraft();
		draft.curation.facts[0].regions = ["zz"];
		expect(errorCodes(factRules(draft))).toEqual(["fact-unknown-region"]);
	});
	test("duplicate fact numbers in Terka_Facts.md fail", () => {
		const draft = validDraft();
		draft.facts.push({
			number: 1,
			line: 2,
			historyLabel: "legenda",
			publicationStatus: "draft",
			text: "Dua."
		});
		expect(errorCodes(factRules(draft))).toContain("duplicate-fact-number");
	});
	test("a duplicate curation.facts number is not silently overwritten", () => {
		const draft = validDraft();
		draft.curation.facts.push({ number: 1, id: "f-001-dup", regions: [] });
		expect(errorCodes(factRules(draft))).toContain("duplicate-fact-entry");
	});
	test("a ready fact without source or check date fails; with both it passes", () => {
		const draft = validDraft();
		draft.facts[0].publicationStatus = "ready";
		expect(errorCodes(factRules(draft))).toEqual(["ready-fact-source"]);
		draft.curation.facts[0].source = "Handboek, 1920, hlm. 3";
		draft.curation.facts[0].sourceCheckedAt = "2026-09-28";
		expect(errorCodes(factRules(draft))).toEqual([]);
	});
});

describe("special plate rules", () => {
	test("the valid draft has no special errors", () => {
		expect(errorCodes(specialRules(validDraft(), TODAY))).toEqual([]);
	});
	test("two high entries with the same number fail and name both ids", () => {
		const draft = validDraft();
		draft.specials.specials[1] = {
			...draft.specials.specials[1],
			number: "12",
			id: "cd-12-india"
		};
		const messages = specialRules(draft, TODAY).filter(
			(message) => message.code === "special-number"
		);
		expect(messages).toHaveLength(1);
		expect(messages[0].message).toContain("cd-12-amerika-serikat");
		expect(messages[0].message).toContain("cd-12-india");
	});
	test("an alias equal to another holder after normalization fails", () => {
		const draft = validDraft();
		draft.specials.specials[0].aliases = ["Republik India"];
		expect(errorCodes(specialRules(draft, TODAY))).toContain("special-holder-collision");
	});
	test("three specials sharing a holder key report every clashing pair once", () => {
		const draft = validDraft();
		draft.specials.specials[0].aliases = ["Republik India"];
		draft.specials.specials.push({
			id: "cd-14-prancis",
			series: "CD",
			number: "14",
			holder: "Prancis",
			holderType: "country",
			aliases: ["India"],
			sourceName: "Prancis",
			confidence: "high",
			needsReview: false,
			sources: ["perpol"],
			validFrom: "2021-05-05",
			reviewBy: "2027-03-24"
		});
		const messages = specialRules(draft, TODAY).filter(
			(message) => message.code === "special-holder-collision"
		);
		expect(messages).toHaveLength(3);
		const pairs = messages.map((message) => message.message);
		expect(
			pairs.some(
				(message) =>
					message.includes("cd-12-amerika-serikat") && message.includes("cd-13-india")
			)
		).toBe(true);
		expect(
			pairs.some(
				(message) =>
					message.includes("cd-12-amerika-serikat") && message.includes("cd-14-prancis")
			)
		).toBe(true);
		expect(
			pairs.some(
				(message) => message.includes("cd-13-india") && message.includes("cd-14-prancis")
			)
		).toBe(true);
	});
	test("a high entry whose source has no check date fails", () => {
		const draft = validDraft();
		draft.specials.sources[0].checkedAt = null;
		expect(errorCodes(specialRules(draft, TODAY))).toContain("special-unchecked-source");
	});
	test("an unknown source id fails", () => {
		const draft = validDraft();
		draft.specials.specials[0].sources = ["hilang"];
		expect(errorCodes(specialRules(draft, TODAY))).toContain("unknown-source");
	});
	test("a media source quoting an agency without originalUrl is a warning", () => {
		const draft = validDraft();
		draft.specials.sources[0].type = "media-mengutip-instansi";
		const messages = specialRules(draft, TODAY);
		expect(errorCodes(messages)).toEqual([]);
		expect(messages.some((message) => message.code === "source-original-url")).toBe(true);
	});
	test("a passed reviewBy is a warning", () => {
		const draft = validDraft();
		draft.specials.specials[0].reviewBy = "2026-01-01";
		expect(specialRules(draft, TODAY).some((message) => message.code === "review-due")).toBe(
			true
		);
	});
	test("a series other than CD fails", () => {
		const draft = validDraft();
		draft.specials.specials[0].series = "CC";
		expect(errorCodes(specialRules(draft, TODAY))).toContain("special-series");
	});
	test("a number with a leading zero or an id not matching the number fails", () => {
		const draft = validDraft();
		draft.specials.specials[0].number = "012";
		expect(errorCodes(specialRules(draft, TODAY))).toEqual(
			expect.arrayContaining(["special-number-format", "special-id-number"])
		);
	});
	test("an RI reference entry with a number fails", () => {
		const draft = validDraft();
		draft.specials.referencePlates[0].number = "1";
		expect(errorCodes(specialRules(draft, TODAY))).toContain("reference-ri-number");
	});
});
