import { describe, expect, test } from "bun:test";
import type { ReviewLog } from "../../../src/core/log/events";
import { sessionSummary } from "../../../src/core/views/summary";
import {
	fresh,
	intro,
	MINUTE,
	NOW,
	review,
	reviewCard,
	ruleBundle,
	seedCard,
	stateOf
} from "../replay/fixtures";

const bundle = ruleBundle();
const rows = (...events: ReturnType<typeof review>[]) =>
	events.map((event) => event.row as ReviewLog);

describe("session summary", () => {
	test("accuracy leaves out introductions and ungraded answers", () => {
		const answers = rows(
			intro("dk", NOW),
			review("bk", "code2region", NOW + MINUTE, { msToFirstKey: 1000 }),
			review("bb", "code2region", NOW + 2 * MINUTE, { correct: false, msToFirstKey: 3000 }),
			review("ba", "code2region", NOW + 3 * MINUTE, {
				correct: null,
				matchType: "unverified",
				msToFirstKey: null
			})
		);
		expect(sessionSummary(fresh(), fresh(), answers, bundle)).toMatchObject({
			answered: 4,
			correct: 1,
			accuracy: 50,
			meanLatencyMs: 2000
		});
	});
	test("a session of introductions only has no accuracy", () => {
		expect(
			sessionSummary(fresh(), fresh(), rows(intro("dk", NOW)), bundle).accuracy
		).toBeNull();
	});
	test("pairs flagged during the session are listed", () => {
		const wrong = (at: number) =>
			review("bd", "code2region", at, {
				context: "challenge",
				correct: false,
				confusedWith: "be"
			});
		const before = stateOf([wrong(NOW), wrong(NOW + MINUTE)]);
		const third = wrong(NOW + 2 * MINUTE);
		const after = stateOf([wrong(NOW), wrong(NOW + MINUTE), third]);
		expect(sessionSummary(before, after, rows(third), bundle).newPairs).toEqual(["bd>be"]);
	});
	test("mastery changes are reported only for groups of answered codes that moved", () => {
		const after = fresh();
		for (const mode of ["code2region", "region2code", "setrecall"])
			seedCard(after, `dk::${mode}`, reviewCard({ state: "mature", intervalDays: 40 }));
		const summary = sessionSummary(
			fresh(),
			after,
			rows(review("dk", "code2region", NOW), review("bk", "code2region", NOW)),
			bundle
		);
		expect(summary.masteryChanges).toEqual([
			{ groupId: "bali-nusa-tenggara", before: 0, after: 60 }
		]);
	});
});
