import { describe, expect, test } from "bun:test";
import { intro, MINUTE, NOW, review, run, stateOf, voidOf } from "../replay/fixtures";

describe("answer counters", () => {
	test("graded answers count; introductions, undone and unverified answers do not", () => {
		const undone = review("dk", "code2region", NOW + 4 * MINUTE, {
			context: "challenge",
			correct: false
		});
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", NOW + MINUTE, { level: 1, questionType: "choice" }),
			review("dk", "code2region", NOW + 2 * MINUTE, { context: "challenge", correct: false }),
			review("dk", "code2region", NOW + 3 * MINUTE, {
				context: "challenge",
				correct: null,
				matchType: "unverified"
			}),
			undone,
			voidOf(undone, NOW + 5 * MINUTE)
		]);
		expect(state.cards.get("dk::code2region")).toMatchObject({ answered: 2, wrong: 1 });
	});
	test("answers of a placement session that does not count are not counted", () => {
		const state = stateOf([
			run("placement", NOW, { id: "p1" }),
			review("bk", "code2region", NOW + MINUTE, {
				context: "placement",
				runId: "p1",
				correct: false
			}),
			run("placement", NOW + 60 * MINUTE, { id: "p2" })
		]);
		expect(state.cards.get("bk::code2region")).toMatchObject({ answered: 0, wrong: 0 });
	});
});

describe("active days", () => {
	test("a day counts once there is an answer other than an introduction", () => {
		expect(stateOf([intro("dk", NOW)]).activeDays.size).toBe(0);
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", NOW + MINUTE, { level: 1, questionType: "choice" }),
			review("bk", "code2region", NOW + 86_400_000, { context: "challenge" })
		]);
		expect([...state.activeDays].sort()).toEqual(["2026-09-21", "2026-09-22"]);
	});
});
