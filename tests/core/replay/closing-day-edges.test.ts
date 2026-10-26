import { describe, expect, test } from "bun:test";
import type { PracticeRun } from "../../../src/core/log/events";
import type { AppState } from "../../../src/core/replay/state";
import { localDay } from "../../../src/core/time/day";
import { DAY, HOUR, intro, MINUTE, NOW, review, run, stateOf, voidOf, WITA } from "./fixtures";

const TODAY = localDay(NOW, WITA);
const flagged = (code: string, other: string) =>
	[0, 1, 2].map((day) =>
		review(code, "code2region", NOW + day * HOUR, { correct: false, confusedWith: other })
	);
const learnedLongAgo = (code: string) => [
	intro(code, NOW - 40 * DAY),
	review(code, "code2region", NOW - 40 * DAY + MINUTE)
];

describe("drills across devices and midnight", () => {
	const drill = (at: number, correct: boolean, deviceId = "device-a") =>
		review("be", "code2region", at, {
			context: "drill",
			drillPairWith: "bd",
			correct,
			deviceId
		});

	test("of two devices drilling the same day, only the earlier answer counts", () => {
		const state = stateOf([
			...flagged("be", "bd"),
			drill(NOW + DAY, false, "device-b"),
			drill(NOW + DAY + MINUTE, true, "device-a")
		]);
		expect(state.pairs.get("be>bd")).toMatchObject({ flagged: true, drillStreak: 0 });
	});
	test("drills a minute either side of local midnight count as two days", () => {
		const midnight = Date.parse("2026-09-22T16:00:00Z"); // 00:00 WITA
		const state = stateOf([
			...flagged("be", "bd"),
			drill(midnight - MINUTE, true),
			drill(midnight + MINUTE, true)
		]);
		expect(state.pairs.get("be>bd")?.drillStreak).toBe(2);
	});
	test("a pair that was never flagged ignores drill answers", () => {
		const state = stateOf([drill(NOW, true)]);
		expect(state.pairs.get("be>bd")).toBeUndefined();
	});
});

describe("completed daily sessions at the edges", () => {
	const daily = (overrides: Partial<PracticeRun> = {}) =>
		run("daily", NOW, { plannedCount: 2, endedAt: NOW + HOUR, ...overrides });
	const answered = (runId: string, codes: string[], start = NOW) =>
		codes.map((code, index) =>
			review(code, "code2region", start + (index + 1) * MINUTE, { runId })
		);
	const done = (state: AppState) => [...state.doneDays];

	test("a run without a planned count never counts", () => {
		const session = daily({ plannedCount: null });
		expect(done(stateOf([session, ...answered(session.row.id, ["ba", "bb"])]))).toEqual([]);
	});
	test("answers from another run do not complete this one", () => {
		const session = daily();
		const other = daily();
		const events = [
			session,
			other,
			...answered(other.row.id, ["ba"]),
			...answered(session.row.id, ["bb"])
		];
		expect(done(stateOf(events))).toEqual([]);
	});
	test("a run answered past midnight counts for the day it started", () => {
		const late = Date.parse("2026-09-21T15:58:00Z"); // 23:58 WITA
		const session = run("daily", late, { plannedCount: 2, endedAt: late + HOUR });
		const state = stateOf([session, ...answered(session.row.id, ["ba", "bb"], late)]);
		expect(done(state)).toEqual([localDay(late, WITA)]);
	});
	test("an unfinished run then a finished one on the same day counts the day once", () => {
		const first = daily();
		const second = daily({ startedAt: NOW + 2 * HOUR, endedAt: NOW + 3 * HOUR });
		const state = stateOf([
			first,
			...answered(first.row.id, ["ba"]),
			second,
			...answered(second.row.id, ["bb", "bm"], NOW + 2 * HOUR)
		]);
		expect(done(state)).toEqual([TODAY]);
	});
	test("other run kinds never mark a done day", () => {
		for (const kind of ["focused", "setrecall", "special", "kilat"] as const) {
			const session = run(kind, NOW, { plannedCount: 1, endedAt: NOW + HOUR });
			expect(done(stateOf([session, ...answered(session.row.id, ["ba"])]))).toEqual([]);
		}
	});
});

describe("the review cap count at the edges", () => {
	const later = NOW + 10 * DAY;
	const capped = (state: AppState) => state.tier.days.get(localDay(later, WITA))?.capped ?? 0;

	test("a reverse card review counts like a forward one", () => {
		// Two forward reviews open the reverse card, which is then learned and due.
		const state = stateOf([
			intro("dk", NOW - 60 * DAY),
			review("dk", "code2region", NOW - 60 * DAY + MINUTE),
			review("dk", "code2region", NOW - 50 * DAY),
			intro("dk", NOW - 30 * DAY, { mode: "region2code" }),
			review("dk", "region2code", NOW - 30 * DAY + MINUTE),
			review("dk", "region2code", later)
		]);
		expect(state.cards.get("dk::region2code")?.lastReviewAt).toBe(later);
		expect(capped(state)).toBe(1);
	});
	test("a second answer on the same related group the same day is not counted again", () => {
		const state = stateOf([
			...learnedLongAgo("dk"),
			review("dk", "code2region", later),
			review("dk", "code2region", later + MINUTE)
		]);
		expect(capped(state)).toBe(1);
	});
	test("focused and recheck answers on due cards use the cap; challenge and kilat do not", () => {
		const graded = stateOf([
			...learnedLongAgo("dk"),
			...learnedLongAgo("bk"),
			review("dk", "code2region", later, { context: "focused" }),
			review("bk", "code2region", later, { context: "recheck" })
		]);
		expect(capped(graded)).toBe(2);
		const ungraded = stateOf([
			...learnedLongAgo("dk"),
			...learnedLongAgo("bk"),
			review("dk", "code2region", later, { context: "challenge" }),
			review("bk", "code2region", later, { context: "kilat" })
		]);
		expect(capped(ungraded)).toBe(0);
	});
	test("a lapse uses the cap but its in-session re-ask does not", () => {
		const state = stateOf([
			...learnedLongAgo("dk"),
			review("dk", "code2region", later, { correct: false }),
			review("dk", "code2region", later + MINUTE)
		]);
		expect(capped(state)).toBe(1);
	});
	test("the count starts again the next day", () => {
		const state = stateOf([...learnedLongAgo("dk"), review("dk", "code2region", later)]);
		expect(state.tier.days.get(localDay(later + DAY, WITA))?.capped ?? 0).toBe(0);
	});
});

describe("recheck results at the edges", () => {
	const later = NOW + 10 * DAY;
	const recheck = (code: string, at: number, correct: boolean) =>
		review(code, "code2region", at, { context: "recheck", correct });

	test("a newer recheck day replaces the older results", () => {
		const state = stateOf([
			...learnedLongAgo("dk"),
			...learnedLongAgo("bk"),
			recheck("dk", later, false),
			recheck("bk", later + 20 * DAY, true)
		]);
		expect(state.recheck?.day).toBe(localDay(later + 20 * DAY, WITA));
		expect([...state.recheck!.results]).toEqual([["bk", true]]);
	});
	test("an undone recheck answer leaves no result", () => {
		const answer = recheck("dk", later, false);
		const state = stateOf([...learnedLongAgo("dk"), answer, voidOf(answer, later + MINUTE)]);
		expect(state.recheck).toBeNull();
	});
});

describe("recheck results across midnight and runs", () => {
	test("a recheck run that crosses midnight keeps the answers from both days", () => {
		const midnight = Date.parse("2026-10-01T16:00:00Z"); // 00:00 WITA
		const runId = "recheck-run";
		const state = stateOf([
			...learnedLongAgo("dk"),
			...learnedLongAgo("bk"),
			review("dk", "code2region", midnight - MINUTE, {
				context: "recheck",
				runId,
				correct: false
			}),
			review("bk", "code2region", midnight + MINUTE, { context: "recheck", runId })
		]);
		expect([...state.recheck!.results].sort()).toEqual([
			["bk", true],
			["dk", false]
		]);
	});
	test("a new recheck run replaces the results of the previous one", () => {
		const later = NOW + 10 * DAY;
		const state = stateOf([
			...learnedLongAgo("dk"),
			...learnedLongAgo("bk"),
			review("dk", "code2region", later, { context: "recheck", runId: "first" }),
			review("bk", "code2region", later + 2 * HOUR, { context: "recheck", runId: "second" })
		]);
		expect([...state.recheck!.results.keys()]).toEqual(["bk"]);
	});
});

describe("placement after a recheck", () => {
	test("a recheck answer counts as practice, so a later placement cannot change the level", () => {
		const recheckOnly = stateOf([
			review("dk", "code2region", NOW, { context: "recheck" }),
			run("placement", NOW + HOUR, { placementLevel: "ahli" })
		]);
		expect(recheckOnly.tier.current).not.toBe("ahli");
	});
});
