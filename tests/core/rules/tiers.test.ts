import { describe, expect, test } from "bun:test";
import { DEFAULT_TIER, TIER_ORDER, TIERS } from "../../../src/rules";

describe("tier table", () => {
	test("every tier keeps new material plus the hold threshold under ten minutes a day", () => {
		for (const tier of TIER_ORDER) {
			const { newPerDay, hold } = TIERS[tier];
			expect(newPerDay * 35 + hold * 5).toBeLessThanOrEqual(600);
		}
	});
	test("skipping placement uses the menengah limits", () => {
		expect(DEFAULT_TIER).toBe("menengah");
		expect(TIERS[DEFAULT_TIER]).toEqual({ newPerDay: 10, hold: 40 });
	});
});
