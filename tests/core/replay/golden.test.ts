import { expect, test } from "bun:test";
import { DAY, HOUR, intro, MINUTE, NOW, review, run, snapshot, stateOf } from "./fixtures";

test("the golden log replays to the recorded state", () => {
	const events = [
		intro("dk", NOW, { id: "g-01" }),
		review("dk", "code2region", NOW + MINUTE, { id: "g-02", level: 1, questionType: "choice" }),
		review("dk", "code2region", NOW + 11 * MINUTE, {
			id: "g-03",
			level: 1,
			questionType: "choice"
		}),
		review("dk", "code2region", NOW + 3 * DAY, { id: "g-04" }),
		review("bk", "code2region", NOW + 3 * DAY + HOUR, {
			id: "g-05",
			context: "challenge",
			correct: false,
			matchType: "none",
			confusedWith: "bb"
		}),
		run("challenge", NOW + 3 * DAY, { id: "g-06" }),
		run("kilat", NOW + 4 * DAY, {
			id: "g-07",
			score: 17,
			scopeLevel: "group",
			scopeId: "sumatera"
		})
	];
	expect(snapshot(stateOf(events))).toMatchSnapshot();
});
