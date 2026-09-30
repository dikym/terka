import { describe, expect, test } from "bun:test";
import { append, replay } from "../../../src/core/replay/replay";
import { ENGINE_VERSION } from "../../../src/rules";
import {
	DAY,
	factView,
	HOUR,
	intro,
	MINUTE,
	NOW,
	review,
	ruleBundle,
	run,
	sighting,
	stateOf,
	voidOf
} from "./fixtures";

describe("placement", () => {
	const answers = (runId: string, at: number) => [
		review("dk", "code2region", at, { context: "placement", runId, msToFirstKey: 2000 }),
		review("bk", "code2region", at + MINUTE, {
			context: "placement",
			runId,
			correct: false,
			matchType: "none",
			confusedWith: "bb"
		})
	];
	test("a correct unassisted answer becomes the first review; a wrong one stays new and records the pair", () => {
		const state = stateOf([
			run("placement", NOW, { id: "p1", placementLevel: "mahir" }),
			...answers("p1", NOW)
		]);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "review", reps: 1 });
		expect(state.cards.get("bk::code2region")!.state).toBe("new");
		expect(state.pairs.get("bk>bb")?.occurrences).toHaveLength(1);
		expect(state.tier.current).toBe("mahir");
		expect(state.quota.size).toBe(0);
	});
	test("only the latest finished placement counts", () => {
		const state = stateOf([
			run("placement", NOW, { id: "p1", placementLevel: "mahir" }),
			...answers("p1", NOW),
			run("placement", NOW + HOUR, { id: "p2", placementLevel: "pemula" }),
			run("placement", NOW + 2 * HOUR, { id: "p3", endedAt: null, placementLevel: null })
		]);
		expect(state.cards.get("dk::code2region")!.state).toBe("new");
		expect(state.pairs.size).toBe(0);
		expect(state.tier.current).toBe("pemula");
	});
	test("a placement answer for a card that is no longer new is ignored", () => {
		expect(() =>
			stateOf([
				intro("dk", NOW - HOUR),
				run("placement", NOW, { id: "p1" }),
				...answers("p1", NOW)
			])
		).not.toThrow();
	});
	test("no placement means menengah", () => {
		expect(stateOf([]).tier.current).toBe("menengah");
	});
});

describe("undo", () => {
	test("undoing an introduction returns the card to new and gives the quota back", () => {
		const first = intro("dk", NOW);
		const state = stateOf([first, voidOf(first, NOW + MINUTE)]);
		expect(state.cards.get("dk::code2region")!.state).toBe("new");
		expect(state.quota.size).toBe(0);
	});
	test("undoing the answer that flagged a pair unflags it", () => {
		const wrong = (at: number) =>
			review("bd", "code2region", at, {
				context: "challenge",
				correct: false,
				confusedWith: "be"
			});
		const third = wrong(NOW + 2 * DAY);
		expect(stateOf([wrong(NOW), wrong(NOW + DAY), third]).pairs.get("bd>be")?.flagged).toBe(
			true
		);
		expect(
			stateOf([
				wrong(NOW),
				wrong(NOW + DAY),
				third,
				voidOf(third, NOW + 2 * DAY + MINUTE)
			]).pairs.get("bd>be")?.flagged
		).toBe(false);
	});
	test("undo leaves every card exactly as before the answer", () => {
		const base = [
			intro("dk", NOW),
			review("dk", "code2region", NOW + MINUTE, { level: 1, questionType: "choice" })
		];
		const last = review("dk", "code2region", NOW + 11 * MINUTE, {
			level: 1,
			questionType: "choice"
		});
		expect(stateOf([...base, last, voidOf(last, NOW + 12 * MINUTE)]).cards).toEqual(
			stateOf(base).cards
		);
	});
});

describe("sessions, sightings and facts", () => {
	test("challenge days collapse per day and Kilat keeps the best score per scope", () => {
		const state = stateOf([
			run("challenge", NOW, { deviceId: "phone" }),
			run("challenge", NOW + HOUR, { deviceId: "laptop" }),
			run("kilat", NOW, { score: 24, scopeLevel: "group", scopeId: "maluku" }),
			run("kilat", NOW + HOUR, {
				score: 28,
				scopeLevel: "group",
				scopeId: "maluku",
				deviceId: "laptop"
			}),
			run("kilat", NOW + 2 * HOUR, { score: 31 }),
			run("kilat", NOW + 3 * HOUR, { score: 40, endedAt: null })
		]);
		expect([...state.challengeDays]).toEqual(["2026-09-21"]);
		expect(state.kilatRecords.get("group|maluku")).toBe(28);
		expect(state.kilatRecords.get("national|")).toBe(31);
	});
	test("sightings and fact views are kept per day", () => {
		const state = stateOf([
			sighting("dk", NOW),
			sighting("dk", NOW + DAY),
			factView("f-001", NOW)
		]);
		expect(state.sightings.get("dk")).toEqual(["2026-09-21", "2026-09-22"]);
		expect(state.factViews).toEqual([{ factId: "f-001", localDay: "2026-09-21", runId: null }]);
	});
});

describe("bad and newer events", () => {
	test("a malformed content id is skipped and reported while other events apply", () => {
		const state = stateOf([review("BAD ID!", "code2region", NOW), intro("dk", NOW + MINUTE)]);
		expect(state.diagnostics).toHaveLength(1);
		expect(state.cards.get("dk::code2region")!.state).toBe("learning");
	});
	test("a set answer without its counts is skipped and reported", () => {
		const state = stateOf([review("dk", "setrecall", NOW, { questionType: "setrecall" })]);
		expect(state.diagnostics[0].reason).toContain("setCorrect");
	});
	test("an event from a newer engine or with an unknown mode stops replay", () => {
		const newer = review("dk", "code2region", NOW, { engineVersion: ENGINE_VERSION + 1 });
		expect(replay([newer], ruleBundle())).toEqual({ status: "outdated" });
		const unknown = review("dk", "code2region", NOW);
		(unknown.row as { mode: string }).mode = "map2code";
		expect(replay([unknown], ruleBundle())).toEqual({ status: "outdated" });
	});
});

describe("append", () => {
	test("a later batch is appended; the input state is not changed", () => {
		const state = stateOf([intro("dk", NOW)]);
		const result = append(state, [
			review("dk", "code2region", NOW + MINUTE, { level: 1, questionType: "choice" })
		]);
		expect(result).not.toBe("full");
		if (result === "full" || result.status !== "ok") throw new Error("expected ok");
		expect(result.state.cards.get("dk::code2region")!.step).toBe(2);
		expect(state.cards.get("dk::code2region")!.step).toBe(1);
	});
	test("a batch that reaches into the past asks for a full replay", () => {
		const state = stateOf([intro("dk", NOW)]);
		const first = intro("bk", NOW - HOUR);
		expect(append(state, [first])).toBe("full");
		expect(append(state, [voidOf(first, NOW + HOUR)])).toBe("full");
		expect(append(state, [run("placement", NOW + HOUR)])).toBe("full");
	});
});
