import { describe, expect, test } from "bun:test";
import type { PracticeRun } from "../../../src/core/log/events";
import { streakDays } from "../../../src/core/replay/streak";
import { localDay } from "../../../src/core/time/day";
import {
	DAY as DAY_MS,
	HOUR,
	intro,
	MINUTE,
	NOW,
	review,
	run,
	stateOf,
	voidOf,
	WITA
} from "./fixtures";

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

	test("only a completed daily session closes the daily queue, a cek ingatan does not", () => {
		const daily = dailyRun(2);
		const recheck = run("recheck", NOW + DAY_MS, {
			plannedCount: 1,
			endedAt: NOW + DAY_MS + MINUTE
		});
		const state = stateOf([
			daily,
			...answers(daily.row.id, ["ba", "bb"]),
			recheck,
			review("ba", "code2region", NOW + DAY_MS + MINUTE / 2, {
				runId: recheck.row.id,
				context: "recheck"
			})
		]);
		const next = localDay(NOW + DAY_MS, WITA);
		expect(state.doneDays.has(next)).toBe(true);
		expect([...state.dailyDoneDays]).toEqual([DAY]);
	});

	test("a daily session finished the same day as a cek ingatan still closes the queue", () => {
		const recheck = run("recheck", NOW, { plannedCount: 1, endedAt: NOW + MINUTE });
		const daily = run("daily", NOW + HOUR, { plannedCount: 1, endedAt: NOW + 2 * HOUR });
		const state = stateOf([
			recheck,
			review("ba", "code2region", NOW + 1, { runId: recheck.row.id, context: "recheck" }),
			daily,
			review("bb", "code2region", NOW + HOUR + MINUTE, { runId: daily.row.id })
		]);
		expect([...state.dailyDoneDays]).toEqual([DAY]);
	});

	test("challenge days and completed daily days both feed the streak", () => {
		const daily = dailyRun(1);
		const challenge = run("challenge", NOW + DAY_MS);
		const state = stateOf([daily, ...answers(daily.row.id, ["ba"]), challenge]);
		expect([...streakDays(state)].sort()).toEqual([DAY, localDay(NOW + DAY_MS, WITA)]);
	});
});

describe("completed sessions whatever the replay order", () => {
	test("answers that sort before their run still complete it", () => {
		// A clock running ahead can tie the run and its answers on time, so ids decide the order.
		const daily = run("daily", NOW + HOUR, { plannedCount: 2, endedAt: NOW + 2 * HOUR });
		const state = stateOf([
			review("ba", "code2region", NOW + MINUTE, { runId: daily.row.id }),
			review("bb", "code2region", NOW + 2 * MINUTE, { runId: daily.row.id }),
			daily
		]);
		expect(state.doneDays.has(DAY)).toBe(true);
	});
	test("a finished cek ingatan counts for the day", () => {
		const recheck = run("recheck", NOW, { plannedCount: 2, endedAt: NOW + HOUR });
		const state = stateOf([
			recheck,
			...["ba", "bb"].map((code, index) =>
				review(code, "code2region", NOW + (index + 1) * MINUTE, {
					runId: recheck.row.id,
					context: "recheck"
				})
			)
		]);
		expect(state.doneDays.has(DAY)).toBe(true);
	});
	test("old unfinished runs are forgotten once their day has passed", () => {
		const daily = dailyRun(3);
		const state = stateOf([
			daily,
			...answers(daily.row.id, ["ba"]),
			review("bb", "code2region", NOW + 3 * DAY_MS)
		]);
		expect(state.runCards.size).toBe(0);
		expect(state.dailyRuns.size).toBe(0);
	});
});
