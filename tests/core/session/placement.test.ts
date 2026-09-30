import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import {
	placementAvailable,
	placementItems,
	placementNext,
	placementStage
} from "../../../src/core/session/placement";
import { DAY, intro, NOW, review, ruleBundle, run, stateOf, voidOf } from "../replay/fixtures";

const FULL = { 1: 8, 2: 10, 3: 10 } as const;
const answers = (stage: 1 | 2 | 3, total: number, correct: number) =>
	Array.from({ length: total }, (_, index) => ({ stage, correct: index < correct }));

describe("adaptive stages", () => {
	test("stage 1 below three correct stops at pemula; three continues", () => {
		expect(placementNext(answers(1, 8, 2), FULL)).toEqual({ done: "pemula" });
		expect(placementNext(answers(1, 8, 3), FULL)).toEqual({ stage: 2 });
		expect(placementNext(answers(1, 5, 3), FULL)).toEqual({ stage: 1 });
	});
	test("stage 2 below six correct stops at menengah", () => {
		expect(placementNext([...answers(1, 8, 8), ...answers(2, 10, 5)], FULL)).toEqual({
			done: "menengah"
		});
		expect(placementNext([...answers(1, 8, 8), ...answers(2, 10, 6)], FULL)).toEqual({
			stage: 3
		});
	});
	test("stage 3 at 70% is ahli, below is mahir", () => {
		const start = [...answers(1, 8, 8), ...answers(2, 10, 10)];
		expect(placementNext([...start, ...answers(3, 10, 7)], FULL)).toEqual({ done: "ahli" });
		expect(placementNext([...start, ...answers(3, 10, 6)], FULL)).toEqual({ done: "mahir" });
	});
});

function tiered(): Bundle {
	const bundle = ruleBundle();
	const tiers = ["common", "medium", "rare"] as const;
	bundle.regions.forEach((region, index) => (region.placementTier = tiers[index % 3]));
	return bundle;
}

describe("stage codes", () => {
	test("each stage draws from its tier, the same way for the same session id", () => {
		const bundle = tiered();
		const common = placementStage(bundle, "p1", 1);
		expect(
			common.every(
				(id) =>
					bundle.regions.find((region) => region.id === id)?.placementTier === "common"
			)
		).toBe(true);
		expect(placementStage(bundle, "p1", 1)).toEqual(common);
		expect(
			placementItems(bundle, "p1", 1).every(
				(item) => item.context === "placement" && item.cardId.endsWith("::code2region")
			)
		).toBe(true);
	});
	test("stage 2 covers every group that has a medium code", () => {
		const bundle = tiered();
		const groups = new Set(
			bundle.regions
				.filter((region) => region.placementTier === "medium")
				.map((region) => region.group)
		);
		const picked = new Set(
			placementStage(bundle, "p1", 2).map(
				(id) => bundle.regions.find((region) => region.id === id)!.group
			)
		);
		expect(picked).toEqual(groups);
	});
	test("a tier smaller than its stage returns what it has", () => {
		const bundle = tiered();
		expect(placementStage(bundle, "p1", 3).length).toBeLessThan(10);
	});
});

describe("availability", () => {
	test("open until the first counted answer outside the test; introductions alone keep it open", () => {
		expect(placementAvailable(stateOf([]))).toBe(true);
		expect(placementAvailable(stateOf([intro("dk", NOW)]))).toBe(true);
		const step = review("dk", "code2region", NOW + 60_000, {
			level: 1,
			questionType: "choice"
		});
		expect(placementAvailable(stateOf([intro("dk", NOW), step]))).toBe(false);
	});
	test("undoing the only counted answer opens the test again", () => {
		const step = review("dk", "code2region", NOW + 60_000, {
			level: 1,
			questionType: "choice"
		});
		expect(
			placementAvailable(stateOf([intro("dk", NOW), step, voidOf(step, NOW + 2 * 60_000)]))
		).toBe(true);
	});
	test("placement answers themselves do not close the offer", () => {
		const events = [
			run("placement", NOW, { id: "p1" }),
			review("dk", "code2region", NOW + DAY, { context: "placement", runId: "p1" })
		];
		expect(placementAvailable(stateOf(events))).toBe(true);
	});
});
