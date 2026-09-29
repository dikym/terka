import { describe, expect, test } from "bun:test";
import { newCard } from "../../../src/core/scheduling/card-memory";
import { createScheduler, nextMemory, retrievability } from "../../../src/core/scheduling/fsrs";
import { fuzzDays } from "../../../src/core/scheduling/fuzz";
import { addDays, dayStart } from "../../../src/core/time/day";
import { NOW, WITA } from "./fixtures";

const DAY = 86_400_000;
const scheduler = createScheduler();
const reviewed = (stability: number, elapsedDays: number) => ({
	...newCard("dk::code2region"),
	state: "review" as const,
	stability,
	difficulty: 5,
	intervalDays: stability,
	reps: 3,
	lastReviewAt: NOW - elapsedDays * DAY,
	due: NOW
});

describe("FSRS wrapper (SRD 4.2–4.3)", () => {
	test("new cards start empty", () => {
		expect(newCard("dk::code2region")).toMatchObject({
			state: "new",
			stability: 0,
			reps: 0,
			suspension: null
		});
		expect(newCard("dk::region2code", true).state).toBe("locked");
	});
	test("retrievability is 0.9 after one stability period and 0 before any review", () => {
		expect(retrievability(scheduler, reviewed(10, 10), NOW)).toBeCloseTo(0.9, 3);
		expect(retrievability(scheduler, newCard("x::code2region"), NOW)).toBe(0);
	});
	test("SR-055: a correct answer at low R raises stability more than at high R", () => {
		const low = nextMemory(scheduler, reviewed(10, 30), 3, NOW).stability / 10;
		const high = nextMemory(scheduler, reviewed(10, 2), 3, NOW).stability / 10;
		expect(low).toBeGreaterThan(high);
	});
	test("SR-056: the target retention is fixed at 0.90", () => {
		expect(createScheduler().parameters.request_retention).toBe(0.9);
	});
});

describe("load-balanced fuzz (SRD 4.6)", () => {
	const today = "2026-09-21";
	test("SR-052: picks the least loaded day within ±5%", () => {
		const load = (day: string) => (day === addDays(today, 41) ? 0 : 2);
		expect(fuzzDays(40, { today, tz: WITA, loadOn: load, seed: "a" })).toEqual({
			days: 41,
			due: dayStart(addDays(today, 41), WITA)
		});
	});
	test("SR-053/AC-17: ties follow the seed, the same seed always picks the same day", () => {
		const options = (seed: string) => ({ today, tz: WITA, loadOn: () => 0, seed });
		expect(fuzzDays(40, options("same"))).toEqual(fuzzDays(40, options("same")));
		const picks = new Set("abcdefgh".split("").map((seed) => fuzzDays(40, options(seed)).days));
		expect([...picks].every((days) => days >= 38 && days <= 42)).toBe(true);
		expect(picks.size).toBeGreaterThan(1);
	});
	test("SR-054: intervals below 3 days are not shifted; fractions round", () => {
		expect(fuzzDays(2, { today, tz: WITA, loadOn: () => 9, seed: "a" }).days).toBe(2);
		expect(fuzzDays(0.4, { today, tz: WITA, loadOn: () => 9, seed: "a" }).days).toBe(1);
	});
	test("SR-057: the due time is 04:00 on the chosen learning day", () => {
		const result = fuzzDays(10, { today, tz: WITA, loadOn: () => 0, seed: "a" });
		expect(result.due).toBe(dayStart(addDays(today, result.days), WITA));
	});
});
