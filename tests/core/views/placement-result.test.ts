import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { placementResult } from "../../../src/core/views/placement-result";
import { ruleBundle } from "../replay/fixtures";

function tiered(): Bundle {
	const bundle = ruleBundle();
	const tiers = ["common", "medium", "rare"] as const;
	bundle.regions.forEach((region, index) => (region.placementTier = tiers[index % 3]));
	return bundle;
}
const answer = (codeId: string, stage: 1 | 2 | 3, correct: boolean) => ({
	codeId,
	stage,
	correct,
	seeded: correct
});

describe("placement result", () => {
	test("known share counts only the tiers that were asked", () => {
		const bundle = tiered();
		const common = bundle.regions
			.filter((region) => region.placementTier === "common")
			.map((region) => region.id);
		const answers = common.slice(0, 4).map((id, index) => answer(id, 1, index < 2));
		expect(placementResult(bundle, answers, "pemula")).toMatchObject({
			knownPercent: Math.round(((2 / 4) * common.length * 100) / 16),
			seededCount: 2
		});
	});
	test("pemula is pointed to Bali & Nusa Tenggara", () => {
		expect(placementResult(tiered(), [], "pemula").suggestedScope).toEqual({
			level: "group",
			id: "bali-nusa-tenggara"
		});
	});
	test("ahli is pointed to the whole country", () => {
		expect(placementResult(tiered(), [], "ahli").suggestedScope).toEqual(NATIONAL);
	});
	test("menengah and mahir get the group with the most new codes left", () => {
		const bundle = tiered();
		expect(placementResult(bundle, [], "menengah").suggestedScope).toEqual({
			level: "group",
			id: "sumatera"
		});
		const knownSumatera = ["bk", "bb", "ba"].map((id) => answer(id, 2, true));
		expect(placementResult(bundle, knownSumatera, "mahir").suggestedScope).toEqual({
			level: "group",
			id: "jawa"
		});
	});
	test("a tie goes to the group that comes first in the data", () => {
		const bundle = tiered();
		const tie = ["bk", "bb"].map((id) => answer(id, 2, true));
		expect(placementResult(bundle, tie, "menengah").suggestedScope).toEqual({
			level: "group",
			id: "sumatera"
		});
	});
	test("a wrong answer leaves its code new", () => {
		const bundle = tiered();
		const wrong = ["bk", "bb", "ba"].map((id) => answer(id, 2, false));
		expect(placementResult(bundle, wrong, "mahir").suggestedScope).toEqual({
			level: "group",
			id: "sumatera"
		});
	});
});
