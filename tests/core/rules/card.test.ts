import { describe, expect, test } from "bun:test";
import {
	answer,
	introduce,
	isDue,
	isLeech,
	seedFromPlacement,
	suspend,
	unlock,
	unsuspend,
	type AnswerContext
} from "../../../src/core/scheduling/card";
import { newCard, type CardMemory } from "../../../src/core/scheduling/card-memory";
import { createScheduler, nextMemory } from "../../../src/core/scheduling/fsrs";
import { addDays, dayStart, localDay } from "../../../src/core/time/day";
import { NOW, WITA } from "./fixtures";

const MINUTE = 60_000;
const DAY = 86_400_000;
const scheduler = createScheduler();
const ctx = (at: number, overrides: Partial<AnswerContext> = {}): AnswerContext => ({
	at,
	localDay: localDay(at, WITA),
	tz: WITA,
	answerId: `answer-${at}`,
	scheduler,
	loadOn: () => 0,
	passesLevel3: false,
	...overrides
});
const strong = (overrides: Partial<CardMemory> = {}): CardMemory => ({
	...newCard("dk::code2region"),
	state: "review",
	stability: 100,
	difficulty: 5,
	intervalDays: 100,
	reps: 5,
	lastReviewAt: NOW - 100 * DAY,
	due: NOW,
	scheduledDay: "2026-06-13",
	...overrides
});

describe("card transitions", () => {
	test("an introduced card is due at once without FSRS", () => {
		const card = introduce(newCard("dk::code2region"), NOW);
		expect(card).toMatchObject({
			state: "learning",
			step: 1,
			due: NOW,
			stability: 0,
			scheduledDay: null
		});
		expect(() => introduce(card, NOW)).toThrow();
	});
	test("a learning card settles after one answer, right or wrong", () => {
		for (const grade of [1, 3] as const) {
			const card = answer(
				introduce(newCard("dk::code2region"), NOW),
				grade,
				ctx(NOW + 30_000)
			);
			expect(card.state).toBe("review");
			expect(card.stability).toBeGreaterThan(0);
		}
	});
	test("a settled card is never due again on the same local day", () => {
		for (const grade of [1, 3] as const) {
			const c = ctx(NOW + 30_000);
			const card = answer(introduce(newCard("dk::code2region"), NOW), grade, c);
			expect(card.due).toBeGreaterThanOrEqual(dayStart(addDays(c.localDay, 1), c.tz));
		}
	});
	test("a late first answer still settles", () => {
		const card = answer(introduce(newCard("x::code2region"), NOW), 3, ctx(NOW + DAY));
		expect(card.state).toBe("review");
	});
	test("a lapse is due again at once and counts once", () => {
		for (const state of ["review", "mature"] as const) {
			const card = answer(strong({ state, passedLevel3: true }), 1, ctx(NOW));
			expect(card).toMatchObject({ state: "relearning", lapses: 1, due: NOW });
		}
	});
	test("a relearning card settles after one answer", () => {
		const lapsed = answer(strong(), 1, ctx(NOW));
		const c = ctx(NOW + 30_000);
		const card = answer(lapsed, 1, c);
		expect(card).toMatchObject({ state: "review", lapses: 1 });
		expect(card.due).toBeGreaterThanOrEqual(dayStart(addDays(c.localDay, 1), c.tz));
	});
	test("finishing relearning keeps the FSRS interval without an extra cut", () => {
		const lapsed = answer(strong(), 1, ctx(NOW));
		const recovered = answer(lapsed, 3, ctx(lapsed.due));
		expect(recovered.state).toBe("review");
		expect(recovered.due).toBe(lapsed.pendingDue!);
		const nextDay = answer(lapsed, 3, ctx(NOW + DAY));
		const expected = nextMemory(scheduler, lapsed, 3, NOW + DAY).scheduledDays;
		expect(nextDay.intervalDays).toBeGreaterThanOrEqual(Math.round(expected * 0.95));
		expect(nextDay.intervalDays).toBeLessThanOrEqual(Math.max(1, Math.round(expected * 1.05)));
	});
	test("a second answer on the same day leaves a review card unchanged", () => {
		const first = answer(strong(), 3, ctx(NOW));
		expect(answer(first, 3, ctx(NOW + MINUTE))).toBe(first);
	});
	test("a same-day repeat answer still records a historical Level 3 pass", () => {
		const first = answer(strong(), 3, ctx(NOW));
		expect(first.passedLevel3).toBe(false);
		const again = answer(first, 3, ctx(NOW + MINUTE, { passesLevel3: true }));
		expect(again).not.toBe(first);
		expect(again).toMatchObject({ ...first, passedLevel3: true });
	});
	test("mature needs 21 days and a historical Level 3 pass", () => {
		expect(answer(strong(), 3, ctx(NOW)).state).toBe("review");
		expect(answer(strong(), 3, ctx(NOW, { passesLevel3: true })).state).toBe("mature");
		const lapsed = answer(strong({ state: "mature", passedLevel3: true }), 1, ctx(NOW));
		expect(answer(lapsed, 3, ctx(NOW + DAY)).state).toBe(
			answer(lapsed, 3, ctx(NOW + DAY)).intervalDays >= 21 ? "mature" : "review"
		);
		expect(lapsed.passedLevel3).toBe(true);
	});
	test("a mature card that recalls correctly stays mature regardless of the new interval", () => {
		const card = strong({
			state: "mature",
			stability: 3,
			intervalDays: 21,
			passedLevel3: true,
			scheduledDay: "2026-06-13"
		});
		const recovered = answer(card, 2, ctx(NOW + DAY));
		expect(recovered.state).toBe("mature");
	});
	test("direct mature check: relearning card recovers to mature with a long interval", () => {
		const lapsed: CardMemory = {
			...strong({ state: "relearning", stability: 200, passedLevel3: true, due: NOW }),
			pendingDue: null
		};
		const recovered = answer(lapsed, 3, ctx(NOW + DAY));
		expect(recovered.intervalDays).toBeGreaterThanOrEqual(21);
		expect(recovered.state).toBe("mature");
	});
	test("the eighth lapse suspends as a leech; six lapses is a leech", () => {
		expect(isLeech(strong({ lapses: 6 }))).toBe(true);
		expect(isLeech(strong({ lapses: 5 }))).toBe(false);
		const card = answer(strong({ lapses: 7 }), 1, ctx(NOW));
		expect(card).toMatchObject({
			state: "suspended",
			suspension: { reason: "leech", resume: "relearning" }
		});
	});
	test("reactivating a leech resets D, S and lapses but keeps its history", () => {
		const leeched = suspend(
			strong({ lapses: 8, passedLevel3: true, state: "relearning" }),
			"leech"
		);
		const card = unsuspend(leeched);
		expect(card).toMatchObject({
			state: "relearning",
			stability: 0,
			difficulty: 0,
			lapses: 0,
			passedLevel3: true,
			suspension: null
		});
		const recovered = answer(card, 3, ctx(NOW + DAY));
		expect(recovered.state).toBe("review");
		expect(recovered.stability).toBeGreaterThan(0);
	});
	test("a suspended learning card is not scheduled until it resumes its step", () => {
		const learning = introduce(newCard("dk::code2region"), NOW);
		const suspended = suspend(learning, "manual");
		expect(suspended).toMatchObject({
			state: "suspended",
			suspension: { reason: "manual", resume: "learning" }
		});
		expect(() => answer(suspended, 3, ctx(NOW + MINUTE))).toThrow();
		expect(unsuspend(suspended)).toEqual(learning);
	});
	test("manual and data suspensions resume the previous state", () => {
		const before = strong();
		const manual = suspend(before, "manual");
		expect(manual).toMatchObject({
			state: "suspended",
			suspension: { reason: "manual", resume: "review" }
		});
		expect(unsuspend(manual)).toEqual(before);
		expect(unsuspend(suspend(before, "confidence"))).toEqual(before);
		expect(suspend(manual, "confidence")).toBe(manual);
		expect(() => answer(manual, 3, ctx(NOW))).toThrow();
	});
	test("placement seeds a review without making it mature", () => {
		const card = seedFromPlacement(newCard("dk::code2region"), 4, ctx(NOW));
		expect(card).toMatchObject({
			state: "review",
			reps: 1,
			pendingDue: null,
			passedLevel3: false
		});
		expect(card.due).toBe(dayStart(addDays("2026-09-21", card.intervalDays), WITA));
	});
	test("unlock and isDue", () => {
		expect(unlock(newCard("dk::region2code", true)).state).toBe("new");
		expect(() => unlock(newCard("dk::region2code"))).toThrow();
		expect(isDue(strong({ due: NOW }), NOW)).toBe(true);
		expect(isDue(strong({ due: NOW + 1 }), NOW)).toBe(false);
	});
});

describe("closing the day at the edges", () => {
	const NEW_YORK = "America/New_York";
	const learning = (at: number) => introduce(newCard("dk::code2region"), at);

	test("an answer a minute before local midnight is not due again until after it", () => {
		const at = Date.parse("2026-11-01T03:59:00Z"); // 23:59 in New York, the day DST ends
		const settled = answer(
			learning(at - MINUTE),
			1,
			ctx(at, { tz: NEW_YORK, localDay: localDay(at, NEW_YORK) })
		);
		expect(settled.state).toBe("review");
		expect(settled.due).toBeGreaterThanOrEqual(
			dayStart(addDays(localDay(at, NEW_YORK), 1), NEW_YORK)
		);
		expect(localDay(settled.due, NEW_YORK) > localDay(at, NEW_YORK)).toBe(true);
	});
	test("a relearning step answered on a later day still settles past that day", () => {
		const lapsed = answer(strong(), 1, ctx(NOW));
		const later = NOW + 3 * DAY;
		const settled = answer(lapsed, 3, ctx(later));
		expect(settled.state).toBe("review");
		expect(settled.due).toBeGreaterThanOrEqual(
			dayStart(addDays(localDay(later, WITA), 1), WITA)
		);
	});
	test("a lapse on a mature card drops it to relearning, due at once", () => {
		const lapsed = answer(strong({ state: "mature", passedLevel3: true }), 1, ctx(NOW));
		expect(lapsed.state).toBe("relearning");
		expect(lapsed.due).toBe(NOW);
	});
	test("a wrong in-session step does not count as a lapse", () => {
		const lapsed = answer(strong(), 1, ctx(NOW));
		const settled = answer(lapsed, 1, ctx(NOW + MINUTE));
		expect(settled.lapses).toBe(lapsed.lapses);
	});
	test("an intro answered wrong in its step is due no sooner than tomorrow", () => {
		const settled = answer(learning(NOW), 1, ctx(NOW + MINUTE));
		expect(settled.due).toBeGreaterThanOrEqual(dayStart(addDays(localDay(NOW, WITA), 1), WITA));
	});
});
