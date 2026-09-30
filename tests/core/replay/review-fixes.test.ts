import { describe, expect, test } from "bun:test";
import { applyEvent } from "../../../src/core/replay/apply";
import {
	HOUR,
	MINUTE,
	NOW,
	fresh,
	intro,
	review,
	reviewCard,
	run,
	seedCard,
	stateOf
} from "./fixtures";

describe("answers that cannot be graded", () => {
	test("an unverified Level 3 answer never passes Level 3", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(
			state,
			review("dk", "code2region", NOW + HOUR, {
				level: 3,
				matchType: "unverified",
				correct: null
			})
		);
		applyEvent(
			state,
			review("bk", "code2region", NOW + HOUR, {
				level: 3,
				matchType: "unverified",
				correct: true
			})
		);
		expect(state.cards.get("dk::code2region")!.passedLevel3).toBe(false);
		expect(state.cards.get("bk::code2region")!.passedLevels).toEqual([false, false, false]);
	});
});

describe("rows replay cannot read", () => {
	test("an unknown time zone is skipped with a diagnostic instead of throwing", () => {
		const state = stateOf([
			intro("dk", NOW, { tz: "Mars/Olympus" }),
			intro("bk", NOW + MINUTE)
		]);
		expect(state.diagnostics).toHaveLength(1);
		expect(state.lastTz).toBe("Asia/Makassar");
		expect(state.cards.get("bk::code2region")!.state).toBe("learning");
	});
	test("a malformed local day is skipped and does not move the day", () => {
		const state = stateOf([
			intro("dk", NOW, { localDay: "21/09/2026" }),
			intro("bk", NOW + MINUTE)
		]);
		expect(state.diagnostics).toHaveLength(1);
		expect(state.currentDay).toBe("2026-09-21");
	});
});

describe("placement after real practice", () => {
	test("a placement finished after the first counted answer does not replace the earlier one", () => {
		const events = [
			run("placement", NOW, { id: "p1", placementLevel: "mahir" }),
			review("dk", "code2region", NOW + MINUTE, {
				context: "placement",
				runId: "p1",
				msToFirstKey: 2000
			}),
			review("dk", "code2region", NOW + 3 * 86_400_000, { deviceId: "device-a" }),
			run("placement", NOW + 4 * 86_400_000, {
				id: "p2",
				deviceId: "device-b",
				placementLevel: "pemula"
			})
		];
		const state = stateOf(events);
		expect(state.placementRunId).toBe("p1");
		expect(state.tier.current).toBe("mahir");
	});
});
