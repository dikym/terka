import { describe, expect, test } from "bun:test";
import { sortEvents } from "../../../src/core/log/order";
import { applyEvent } from "../../../src/core/replay/apply";
import { effectiveCard } from "../../../src/core/replay/universe";
import {
	cardEvent,
	DAY,
	fresh,
	HOUR,
	intro,
	MINUTE,
	NOW,
	review,
	reviewCard,
	ruleBundle,
	seedCard,
	stateOf,
	WITA
} from "./fixtures";

const schedule = (card: { due: number; stability: number; reps: number; lapses: number }) => ({
	due: card.due,
	stability: card.stability,
	reps: card.reps,
	lapses: card.lapses
});

describe("introduction and learning steps", () => {
	test("an introduction starts learning without a grade, sample or confused pair", () => {
		const state = stateOf([intro("dk", NOW, { correct: false, confusedWith: "dr" })]);
		expect(state.cards.get("dk::code2region")).toMatchObject({
			state: "learning",
			step: 1,
			due: NOW,
			stability: 0,
			reps: 0
		});
		expect(state.quota.get("region|2026-09-21")).toBe(1);
		expect(state.pairs.size).toBe(0);
		expect(state.narrow.size).toBe(0);
		expect(state.introDay.get("dk")).toBe("2026-09-21");
	});
	test("one step then FSRS", () => {
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", NOW + MINUTE, { level: 1, questionType: "choice" })
		]);
		const card = state.cards.get("dk::code2region")!;
		expect(card.state).toBe("review");
		expect(card.due).toBeGreaterThan(NOW + DAY / 2);
	});
	test("a step answered the next day settles to review", () => {
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", NOW + DAY, { level: 1, questionType: "choice" })
		]);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "review", step: 0 });
	});
	test("a second introduction of the same card from another device is only recorded", () => {
		const state = stateOf([
			intro("dk", NOW),
			intro("dk", NOW + MINUTE / 2, { deviceId: "device-b" })
		]);
		expect(state.quota.get("region|2026-09-21")).toBe(1);
	});
});

describe("which answers change the schedule", () => {
	test("only the first same-day daily answer changes the schedule", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		const first = schedule(state.cards.get("dk::code2region")!);
		applyEvent(state, review("dk", "code2region", NOW + 2 * HOUR, { correct: false }));
		expect(schedule(state.cards.get("dk::code2region")!)).toEqual(first);
	});
	test("a wrong review goes to relearning with one more lapse", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { correct: false }));
		expect(state.cards.get("dk::code2region")).toMatchObject({
			state: "relearning",
			lapses: 1,
			due: NOW + HOUR
		});
	});
	test("one scheduled answer per related group per day", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		seedCard(state, "dk::region2code", reviewCard());
		const before = schedule(state.cards.get("dk::region2code")!);
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		applyEvent(state, review("dk", "region2code", NOW + 2 * HOUR));
		expect(schedule(state.cards.get("dk::region2code")!)).toEqual(before);
		expect(state.cards.get("dk::code2region")!.due).toBeGreaterThan(NOW + DAY);
	});
	test("a learning step does not use the related group's day", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", { state: "learning", step: 1, due: NOW });
		seedCard(state, "dk::region2code", reviewCard());
		applyEvent(state, review("dk", "region2code", NOW + HOUR));
		applyEvent(
			state,
			review("dk", "code2region", NOW + 2 * HOUR, { level: 1, questionType: "choice" })
		);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "review", step: 0 });
		expect(state.cards.get("dk::region2code")!.due).toBeGreaterThan(NOW + DAY);
	});
	test("challenge and Kilat never change the schedule but still record confused pairs", () => {
		const state = fresh();
		seedCard(state, "bd::code2region", reviewCard());
		const before = schedule(state.cards.get("bd::code2region")!);
		applyEvent(
			state,
			review("bd", "code2region", NOW + HOUR, {
				context: "challenge",
				correct: false,
				confusedWith: "be"
			})
		);
		applyEvent(
			state,
			review("bd", "code2region", NOW + 2 * HOUR, {
				context: "kilat",
				level: 1,
				correct: false,
				confusedWith: "be"
			})
		);
		expect(schedule(state.cards.get("bd::code2region")!)).toEqual(before);
		expect(state.pairs.get("bd>be")?.occurrences).toHaveLength(2);
	});
	test("a lower manual level keeps the schedule and stays out of percentiles but records pairs", () => {
		const state = fresh();
		seedCard(state, "bd::code2region", reviewCard());
		const before = schedule(state.cards.get("bd::code2region")!);
		applyEvent(
			state,
			review("bd", "code2region", NOW + HOUR, {
				level: 1,
				levelSource: "manual_down",
				correct: false,
				confusedWith: "be"
			})
		);
		expect(schedule(state.cards.get("bd::code2region")!)).toEqual(before);
		expect(state.pairs.has("bd>be")).toBe(true);
		applyEvent(
			state,
			review("bd", "code2region", NOW + 2 * HOUR, { level: 1, levelSource: "manual_down" })
		);
		expect(state.narrow.size).toBe(0);
	});
	test("focused practice counts only for cards already due", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 3 * DAY }));
		seedCard(state, "bk::code2region", reviewCard());
		const notDue = schedule(state.cards.get("dk::code2region")!);
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { context: "focused" }));
		applyEvent(state, review("bk", "code2region", NOW + HOUR, { context: "focused" }));
		expect(schedule(state.cards.get("dk::code2region")!)).toEqual(notDue);
		expect(state.cards.get("bk::code2region")!.reps).toBe(6);
	});
	test("on two offline devices the earlier same-day answer wins", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		const phone = review("dk", "code2region", Date.parse("2026-09-21T07:10:00+08:00"), {
			deviceId: "phone"
		});
		const laptop = review("dk", "code2region", Date.parse("2026-09-21T20:00:00+08:00"), {
			deviceId: "laptop",
			correct: false
		});
		for (const event of sortEvents([laptop, phone])) applyEvent(state, event);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "review", lapses: 0 });
	});
	test("an answer after a manual suspend is recorded without changing the schedule", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(
			state,
			cardEvent("dk", "code2region", "suspend", NOW + HOUR, { deviceId: "laptop" })
		);
		applyEvent(
			state,
			review("dk", "code2region", NOW + 2 * HOUR, { deviceId: "phone", correct: false })
		);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "suspended", lapses: 0 });
	});
	test("an answer before a manual suspend counts, then the card is suspended", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { correct: false }));
		applyEvent(state, cardEvent("dk", "code2region", "suspend", NOW + 2 * HOUR));
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "suspended", lapses: 1 });
	});
});

describe("related cards unlock", () => {
	test("region2code and setrecall open from the code2region interval and never lock again", () => {
		for (const stability of [2, 30]) {
			const state = fresh();
			seedCard(
				state,
				"dk::code2region",
				reviewCard({ stability, lastReviewAt: NOW - stability * DAY })
			);
			applyEvent(state, review("dk", "code2region", NOW + HOUR));
			const interval = state.cards.get("dk::code2region")!.intervalDays;
			expect(state.cards.get("dk::region2code")!.state).toBe(
				interval >= 7 ? "new" : "locked"
			);
			expect(state.cards.get("dk::setrecall")!.state).toBe(interval >= 14 ? "new" : "locked");
		}
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		expect(state.cards.get("dk::region2code")!.state).toBe("new");
		const due = state.cards.get("dk::code2region")!.due;
		applyEvent(state, review("dk", "code2region", due + HOUR, { correct: false }));
		expect(state.cards.get("dk::region2code")!.state).toBe("new");
	});
	test("holder2special opens from the special2holder interval", () => {
		const state = fresh();
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		applyEvent(
			state,
			review("cd-49-jepang", "special2holder", NOW + HOUR, { context: "special" })
		);
		expect(state.cards.get("cd-49-jepang::holder2special")!.state).toBe("new");
	});
});

describe("leech and manual suspension", () => {
	test("the eighth lapse suspends the card; unsuspending resets D, S and lapses", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 7 }));
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { correct: false }));
		expect(state.cards.get("dk::code2region")).toMatchObject({
			state: "suspended",
			suspension: { reason: "leech" }
		});
		applyEvent(state, cardEvent("dk", "code2region", "unsuspend", NOW + 2 * HOUR));
		expect(state.cards.get("dk::code2region")).toMatchObject({
			lapses: 0,
			stability: 0,
			difficulty: 0
		});
	});
	test("a manual suspend and unsuspend keep D, S and due", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		const before = schedule(state.cards.get("dk::code2region")!);
		applyEvent(state, cardEvent("dk", "code2region", "suspend", NOW + HOUR));
		applyEvent(state, cardEvent("dk", "code2region", "unsuspend", NOW + 2 * HOUR));
		expect(schedule(state.cards.get("dk::code2region")!)).toEqual(before);
		expect(state.cards.get("dk::code2region")!.state).toBe("review");
	});
	test("card events that do not fit the card are ignored", () => {
		const state = fresh();
		expect(() => {
			applyEvent(state, cardEvent("dk", "code2region", "unsuspend", NOW));
			applyEvent(state, cardEvent("dk", "region2code", "suspend", NOW));
		}).not.toThrow();
		expect(state.cards.get("dk::code2region")!.state).toBe("new");
		expect(state.cards.get("dk::region2code")!.state).toBe("locked");
	});
	test("a leech answer is assisted, so a Level 3 success does not pass Level 3", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 6 }));
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { level: 3 }));
		expect(state.cards.get("dk::code2region")!.passedLevel3).toBe(false);
	});
});

describe("level success and counted days", () => {
	test("a valid correct answer marks its level; the first counted answer sets the day", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { level: 3 }));
		expect(state.cards.get("dk::code2region")!.passedLevels).toEqual([false, false, true]);
		expect(state.cards.get("dk::code2region")!.passedLevel3).toBe(true);
		expect(state.firstCountedDay).toBe("2026-09-21");
		expect(state.tier.days.get("2026-09-21")).toMatchObject({ reviews: 1, reviewsCorrect: 1 });
	});
	test("a Level 3 success that does not count for the schedule still passes Level 3", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		applyEvent(
			state,
			review("dk", "code2region", NOW + HOUR, { context: "challenge", level: 3 })
		);
		expect(state.cards.get("dk::code2region")!.passedLevel3).toBe(true);
	});
	test("an event from a device whose day is behind keeps its own day", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard());
		seedCard(state, "bk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		applyEvent(
			state,
			review("bk", "code2region", NOW + 2 * HOUR, {
				localDay: "2026-09-20",
				tz: "Asia/Jakarta"
			})
		);
		expect(state.currentDay).toBe("2026-09-21");
		expect(state.tier.days.get("2026-09-20")?.reviews).toBe(1);
		expect(state.lastTz).toBe("Asia/Jakarta");
	});
});

describe("related-card skips", () => {
	test("a due card skipped for its group counts skip days and resets when served", () => {
		const state = fresh();
		state.currentDay = "2026-09-20";
		state.lastTz = WITA;
		seedCard(state, "dk::code2region", reviewCard());
		seedCard(state, "dk::region2code", reviewCard());
		seedCard(state, "dk::setrecall", reviewCard({ due: NOW + DAY }));
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		applyEvent(
			state,
			review("dk", "setrecall", NOW + DAY + HOUR, {
				questionType: "setrecall",
				setCorrect: 5,
				setThreshold: 2
			})
		);
		expect(state.cards.get("dk::region2code")!.relatedSkips).toBe(1);
		applyEvent(state, review("dk", "region2code", NOW + 2 * DAY + HOUR));
		expect(state.cards.get("dk::region2code")!.relatedSkips).toBe(2);
		applyEvent(
			state,
			review("bk", "code2region", NOW + 3 * DAY + HOUR, { context: "challenge" })
		);
		expect(state.cards.get("dk::region2code")!.relatedSkips).toBe(0);
	});
});

describe("content overlay during replay", () => {
	test("answers while the code is missing do not count; history returns with the data", () => {
		const events = [
			intro("dk", NOW),
			review("dk", "code2region", NOW + 2 * MINUTE, { level: 1, questionType: "choice" })
		];
		const missing = ruleBundle();
		missing.regions = missing.regions.filter((region) => region.id !== "dk");
		const state = stateOf(events, missing);
		expect(state.cards.get("dk::code2region")).toMatchObject({ state: "learning", step: 1 });
		expect(effectiveCard(state, "dk::code2region")?.suspension?.reason).toBe("missing-data");
		expect(stateOf(events).cards.get("dk::code2region")).toMatchObject({
			state: "review",
			step: 0
		});
	});
});

describe("recent level two results", () => {
	test("counted level two answers are kept in answer order", () => {
		const state = fresh();
		for (const code of ["dk", "dr", "ea"])
			seedCard(state, `${code}::code2region`, reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR));
		applyEvent(state, review("dr", "code2region", NOW + 2 * HOUR));
		applyEvent(state, review("ea", "code2region", NOW + 3 * HOUR, { correct: false }));
		expect(state.levelTwoResults).toEqual([true, true, false]);
	});
	test("answers that do not change the schedule or are not level two are left out", () => {
		const state = fresh();
		for (const code of ["dk", "dr"]) seedCard(state, `${code}::code2region`, reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { level: 3 }));
		applyEvent(state, review("dk", "code2region", NOW + 2 * HOUR));
		applyEvent(state, review("dr", "code2region", NOW + HOUR, { context: "kilat", level: 1 }));
		expect(state.levelTwoResults).toEqual([]);
	});
	test("diplomat answers do not calibrate the region rungs", () => {
		const state = fresh();
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		applyEvent(
			state,
			review("cd-49-jepang", "special2holder", NOW + HOUR, { context: "special" })
		);
		expect(state.levelTwoResults).toEqual([]);
	});
	test("only the latest window is kept", () => {
		const state = fresh();
		state.levelTwoResults = Array.from({ length: 200 }, () => true);
		seedCard(state, "dk::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { correct: false }));
		expect(state.levelTwoResults).toHaveLength(200);
		expect(state.levelTwoResults.at(-1)).toBe(false);
	});
});

describe("optimizer training data", () => {
	test("a level two choice is marked as recognized, a typed answer is not", () => {
		const state = fresh();
		state.counted = [];
		seedCard(state, "dk::code2region", reviewCard());
		seedCard(state, "dr::code2region", reviewCard());
		applyEvent(state, review("dk", "code2region", NOW + HOUR, { questionType: "choice" }));
		applyEvent(state, review("dr", "code2region", NOW + HOUR));
		expect(state.counted.map((answer) => answer.recognized)).toEqual([true, false]);
	});
});
