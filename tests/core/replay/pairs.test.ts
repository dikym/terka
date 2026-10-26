import { describe, expect, test } from "bun:test";
import type { ReviewLog } from "../../../src/core/log/events";
import { confusionsOf, recordConfusion, recordDrill } from "../../../src/core/replay/pairs";
import { addDays } from "../../../src/core/time/day";
import { fresh, NOW, review } from "./fixtures";

const day = (offset: number) => addDays("2026-09-01", offset);

describe("confused pairs", () => {
	test("three occurrences within 30 days flag the pair", () => {
		const state = fresh();
		for (const offset of [0, 10, 29]) recordConfusion(state, "be", "bd", day(offset));
		expect(state.pairs.get("be>bd")?.flagged).toBe(true);
	});
	test("a pair flagged today is not drilled until tomorrow", () => {
		const state = fresh();
		for (const offset of [0, 10, 29]) recordConfusion(state, "be", "bd", day(offset));
		expect(state.pairs.get("be>bd")?.drillDay).toBe(day(29));
	});
	test("three occurrences spread over 31 days do not", () => {
		const state = fresh();
		for (const offset of [0, 15, 30]) recordConfusion(state, "be", "bd", day(offset));
		expect(state.pairs.get("be>bd")?.flagged).toBe(false);
	});
	test("five right drills on five days clear the pair, and two new occurrences flag it again", () => {
		const state = fresh();
		for (const offset of [0, 1, 2]) recordConfusion(state, "be", "bd", day(offset));
		for (let index = 0; index < 5; index++)
			recordDrill(state, "be", "bd", true, day(3 + index));
		expect(state.pairs.get("be>bd")).toMatchObject({ flagged: false, cleared: true });
		recordConfusion(state, "be", "bd", day(9));
		expect(state.pairs.get("be>bd")?.flagged).toBe(false);
		recordConfusion(state, "be", "bd", day(10));
		expect(state.pairs.get("be>bd")?.flagged).toBe(true);
	});
	test("a wrong drill resets the correct-drill count", () => {
		const state = fresh();
		for (const offset of [0, 1, 2]) recordConfusion(state, "be", "bd", day(offset));
		for (let index = 0; index < 4; index++)
			recordDrill(state, "be", "bd", true, day(3 + index));
		recordDrill(state, "be", "bd", false, day(7));
		expect(state.pairs.get("be>bd")).toMatchObject({ flagged: true, drillStreak: 0 });
	});
	test("only the first drill of a day counts", () => {
		const state = fresh();
		for (const offset of [0, 1, 2]) recordConfusion(state, "be", "bd", day(offset));
		recordDrill(state, "be", "bd", true, day(3));
		recordDrill(state, "be", "bd", true, day(3));
		expect(state.pairs.get("be>bd")?.drillStreak).toBe(1);
	});
	test("a day without a drill keeps the count", () => {
		const state = fresh();
		for (const offset of [0, 1, 2]) recordConfusion(state, "be", "bd", day(offset));
		for (const offset of [3, 4, 8]) recordDrill(state, "be", "bd", true, day(offset));
		expect(state.pairs.get("be>bd")?.drillStreak).toBe(3);
	});
	test("pairs are directed", () => {
		const state = fresh();
		for (const offset of [0, 1, 2]) recordConfusion(state, "be", "bd", day(offset));
		expect(state.pairs.has("bd>be")).toBe(false);
	});
	test("a set answer counts each different confused code once", () => {
		const row = review("dk", "setrecall", NOW, {
			questionType: "setrecall",
			setItems: [
				["mataram", "kota-mataram", "none", 0, "dr"],
				["lombok barat", "kab-lombok-barat", "none", 0, "dr"],
				["bima", "kota-bima", "none", 0, "ea"],
				["denpasar", "kota-denpasar", "exact", 0, null]
			]
		}).row as ReviewLog;
		expect(confusionsOf(row)).toEqual(["dr", "ea"]);
	});
	test("a single answer confuses only when it is wrong", () => {
		const wrong = review("bd", "code2region", NOW, { correct: false, confusedWith: "be" })
			.row as ReviewLog;
		const right = review("bd", "code2region", NOW, { confusedWith: "be" }).row as ReviewLog;
		expect(confusionsOf(wrong)).toEqual(["be"]);
		expect(confusionsOf(right)).toEqual([]);
	});
});
