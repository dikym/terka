import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
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
	test("other levels get the weakest group of stages 2 and 3, ties in the suggested order", () => {
		const bundle = tiered();
		const answers = [
			answer("bb", 2, true),
			answer("a", 2, false),
			answer("p", 2, false),
			answer("dr", 2, true),
			answer("bk", 1, false)
		];
		expect(placementResult(bundle, answers, "mahir").suggestedScope).toEqual({
			level: "group",
			id: "jawa"
		});
		const tie = [answer("dr", 2, false), answer("a", 2, false)];
		expect(placementResult(bundle, tie, "menengah").suggestedScope).toEqual({
			level: "group",
			id: "bali-nusa-tenggara"
		});
	});
});
