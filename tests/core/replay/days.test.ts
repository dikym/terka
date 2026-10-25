import { describe, expect, test } from "bun:test";
import { advanceDays, advanceTo, priorityLoad, quotaLeft } from "../../../src/core/replay/days";
import type { AppState } from "../../../src/core/replay/state";
import { addDays } from "../../../src/core/time/day";
import { DAY, fresh, manyRegions, NOW, reviewCard, seedCard, WITA } from "./fixtures";

const TODAY = "2026-09-21";

function fillWindow(state: AppState, day: string, reviews: number, correct: number, heldDays = 0) {
	for (let offset = 1; offset <= 30; offset++) {
		state.tier.days.set(addDays(day, -offset), {
			tier: state.tier.current,
			reviews,
			reviewsCorrect: correct,
			held: offset <= heldDays,
			capped: 0
		});
		state.activeDays.add(addDays(day, -offset));
	}
}

// Fifteen held days with nothing practised, then fifteen practised days at 225 of 255 correct.
function absence(state: AppState, day: string, practisedWhileHeld: boolean) {
	for (let offset = 1; offset <= 30; offset++) {
		const held = offset <= 15;
		state.tier.days.set(addDays(day, -offset), {
			tier: state.tier.current,
			reviews: held ? 0 : 17,
			reviewsCorrect: held ? 0 : 15,
			held,
			capped: 0
		});
		if (!held || practisedWhileHeld) state.activeDays.add(addDays(day, -offset));
	}
}

function ready(state: AppState, day: string, firstCounted = "2026-07-01") {
	state.firstCountedDay = firstCounted;
	state.currentDay = addDays(day, -1);
	state.lastTz = WITA;
}

describe("new material quota", () => {
	test("overflow from two offline devices is cut from the next day", () => {
		const state = fresh();
		state.quota.set("region|2026-09-20", 14);
		expect(quotaLeft(state, "region", TODAY)).toBe(6);
	});
	test("overflow is cut by at most one daily limit and only from the next day", () => {
		const state = fresh();
		state.quota.set("region|2026-09-20", 25);
		expect(quotaLeft(state, "region", TODAY)).toBe(0);
		expect(quotaLeft(state, "region", "2026-09-22")).toBe(10);
	});
	test("today's introductions use the quota", () => {
		const state = fresh();
		state.quota.set(`region|${TODAY}`, 4);
		expect(quotaLeft(state, "region", TODAY)).toBe(6);
	});
	test("special codes have their own limit of five", () => {
		const state = fresh();
		state.quota.set("special|2026-09-20", 7);
		expect(quotaLeft(state, "special", TODAY)).toBe(3);
		expect(quotaLeft(state, "region", TODAY)).toBe(10);
	});
});

describe("priority load and hold", () => {
	test("41 due cards hold new material, 40 do not", () => {
		for (const [due, held] of [
			[41, true],
			[40, false]
		] as const) {
			const state = fresh(manyRegions(45));
			for (let index = 0; index < due; index++)
				seedCard(state, `x${index}::code2region`, reviewCard());
			state.currentDay = "2026-09-20";
			state.lastTz = WITA;
			advanceDays(state, TODAY);
			expect(priorityLoad(state, TODAY, WITA)).toBe(due);
			expect(state.tier.days.get(TODAY)?.held).toBe(held);
		}
	});
	test("setrecall, special, suspended and not yet due cards stay out of the load", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", reviewCard());
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		seedCard(state, "bk::code2region", { ...reviewCard(), state: "suspended" });
		seedCard(state, "ba::code2region", reviewCard({ due: NOW + 3 * DAY }));
		seedCard(state, "bm::code2region", reviewCard());
		seedCard(state, "bp::code2region", { ...reviewCard(), state: "learning", step: 1 });
		expect(priorityLoad(state, TODAY, WITA)).toBe(2);
	});
	test("an active confused pair adds one drill unless a code is suspended", () => {
		const state = fresh();
		state.pairs.set("be>bd", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0,
			drillDay: null
		});
		expect(priorityLoad(state, TODAY, WITA)).toBe(1);
		seedCard(state, "bd::code2region", { ...reviewCard(), state: "suspended" });
		expect(priorityLoad(state, TODAY, WITA)).toBe(0);
	});
});

describe("tier adjustment", () => {
	test("accuracy of at least 90% with few held days moves up one tier", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 10, 10);
		advanceDays(state, TODAY);
		expect(state.tier).toMatchObject({ current: "mahir", changedOn: TODAY });
		expect(state.tier.days.get(TODAY)?.tier).toBe("mahir");
	});
	test("no second change within 14 days", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 10, 10);
		advanceDays(state, TODAY);
		fillWindow(state, "2026-09-22", 10, 10);
		advanceDays(state, "2026-09-22");
		expect(state.tier.current).toBe("mahir");
	});
	test("accuracy under 80% moves down one tier", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 10, 7);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("pemula");
	});
	test("more than ten held days moves down one tier", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 10, 9, 11);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("pemula");
	});
	test("held days during an absence do not move the tier down", () => {
		const state = fresh();
		ready(state, TODAY);
		absence(state, TODAY, false);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("menengah");
	});
	test("held days the user practised on still move the tier down", () => {
		const state = fresh();
		ready(state, TODAY);
		absence(state, TODAY, true);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("pemula");
	});
	test("between the thresholds nothing changes", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 20, 17, 10);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("menengah");
	});
	test("fewer than 200 reviews in 30 days skip the evaluation", () => {
		const state = fresh();
		ready(state, TODAY);
		fillWindow(state, TODAY, 6, 6);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("menengah");
	});
	test("no evaluation before 30 full days since the first counted answer", () => {
		const state = fresh();
		ready(state, TODAY, "2026-09-01");
		fillWindow(state, TODAY, 10, 10);
		advanceDays(state, TODAY);
		expect(state.tier.current).toBe("menengah");
	});
	test("ahli never moves up and pemula never moves down", () => {
		const top = fresh();
		top.tier.current = "ahli";
		ready(top, TODAY);
		fillWindow(top, TODAY, 10, 10);
		advanceDays(top, TODAY);
		expect(top.tier.current).toBe("ahli");
		const bottom = fresh();
		bottom.tier.current = "pemula";
		ready(bottom, TODAY);
		fillWindow(bottom, TODAY, 10, 5);
		advanceDays(bottom, TODAY);
		expect(bottom.tier.current).toBe("pemula");
	});
});

describe("day advance", () => {
	test("advanceTo returns a new state and leaves the input unchanged", () => {
		const state = fresh();
		state.currentDay = "2026-09-20";
		const next = advanceTo(state, TODAY, WITA);
		expect(next.currentDay).toBe(TODAY);
		expect(state.currentDay).toBe("2026-09-20");
	});
	test("a 400-day gap advances without a tier change", () => {
		const state = fresh();
		state.currentDay = "2025-08-17";
		state.lastTz = WITA;
		const started = performance.now();
		advanceDays(state, TODAY);
		expect(performance.now() - started).toBeLessThan(200);
		expect(state.currentDay).toBe(TODAY);
		expect(state.tier.current).toBe("menengah");
	});
	test("a day behind the current day does not move the day back", () => {
		const state = fresh();
		state.currentDay = TODAY;
		advanceDays(state, "2026-09-20");
		expect(state.currentDay).toBe(TODAY);
	});
});
