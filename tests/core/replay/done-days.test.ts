import { describe, expect, test } from "bun:test";
import type { PracticeRun } from "../../../src/core/log/events";
import { streakDays } from "../../../src/core/replay/streak";
import { localDay } from "../../../src/core/time/day";
import { DAY as DAY_MS, intro, MINUTE, NOW, review, run, stateOf, voidOf, WITA } from "./fixtures";

const DAY = localDay(NOW, WITA);

function dailyRun(planned: number, overrides: Partial<PracticeRun> = {}) {
	return run("daily", NOW, { plannedCount: planned, endedAt: NOW + 10 * MINUTE, ...overrides });
}

const answers = (runId: string, codes: string[]) =>
	codes.map((code, index) => review(code, "code2region", NOW + (index + 1) * MINUTE, { runId }));

describe("completed daily sessions", () => {
	test("a daily run that answered every planned card counts for the day", () => {
		const daily = dailyRun(3);
		const state = stateOf([daily, ...answers(daily.row.id, ["ba", "bb", "be"])]);
		expect(state.doneDays.has(DAY)).toBe(true);
	});

	test("introductions answered in the run count as planned cards", () => {
		const daily = dailyRun(2);
		const state = stateOf([
			daily,
			intro("ba", NOW + MINUTE, { runId: daily.row.id }),
			intro("bb", NOW + 2 * MINUTE, { runId: daily.row.id })
		]);
		expect(state.doneDays.has(DAY)).toBe(true);
	});

	test("re-asks do not make an early exit count", () => {
		const daily = dailyRun(3);
		const state = stateOf([daily, ...answers(daily.row.id, ["ba", "bb", "ba"])]);
		expect(state.doneDays.has(DAY)).toBe(false);
	});

	test("an unclosed daily run does not count", () => {
		const daily = dailyRun(2, { endedAt: null });
		const state = stateOf([daily, ...answers(daily.row.id, ["ba", "bb"])]);
		expect(state.doneDays.has(DAY)).toBe(false);
	});

	test("an undone answer does not count toward the plan", () => {
		const daily = dailyRun(2);
		const [first, second] = answers(daily.row.id, ["ba", "bb"]);
		const state = stateOf([daily, first, second, voidOf(second, NOW + 3 * MINUTE)]);
		expect(state.doneDays.has(DAY)).toBe(false);
	});

	test("challenge days and completed daily days both feed the streak", () => {
		const daily = dailyRun(1);
		const challenge = run("challenge", NOW + DAY_MS);
		const state = stateOf([daily, ...answers(daily.row.id, ["ba"]), challenge]);
		expect([...streakDays(state)].sort()).toEqual([DAY, localDay(NOW + DAY_MS, WITA)]);
	});
});
