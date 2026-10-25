import { describe, expect, test } from "bun:test";
import { dailyQueue } from "../../../src/core/session/queue";
import { addDays, dayStart, localDay } from "../../../src/core/time/day";
import { ctxAt, SETTINGS } from "../session/fixtures";
import { intro, NOW, review, ruleBundle, stateOf, WITA } from "./fixtures";

describe("the in-session learning step", () => {
	test("an intro then one daily answer leaves the card in review, due tomorrow or later", () => {
		const answeredAt = NOW + 30_000;
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", answeredAt, { context: "daily" })
		]);
		const card = state.cards.get("dk::code2region")!;
		expect(card.state).toBe("review");
		expect(card.due).toBeGreaterThanOrEqual(
			dayStart(addDays(localDay(answeredAt, WITA), 1), WITA)
		);
	});
	test("an intro left unanswered is still due in the next session", () => {
		const state = stateOf([intro("dk", NOW)]);
		const { items } = dailyQueue(state, ruleBundle(), SETTINGS, ctxAt(NOW + 60_000));
		expect(items).toContainEqual(
			expect.objectContaining({ cardId: "dk::code2region", slot: "step" })
		);
	});
});

describe("the daily review cap count", () => {
	const learned = (code: string) => [
		intro(code, NOW),
		review(code, "code2region", NOW + 30_000, { context: "daily" })
	];
	const later = NOW + 10 * 86_400_000;
	const laterDay = localDay(later, WITA);

	test("a scheduled review of a region card uses the day's cap", () => {
		const state = stateOf([
			...learned("dk"),
			review("dk", "code2region", later, { context: "daily" })
		]);
		expect(state.tier.days.get(laterDay)?.capped).toBe(1);
	});
	test("drill, setrecall and special answers leave the cap alone", () => {
		const state = stateOf([
			...learned("dk"),
			review("dk", "code2region", later, { context: "drill", drillPairWith: "bk" }),
			intro("cd-49-jepang", NOW, { mode: "special2holder" }),
			review("cd-49-jepang", "special2holder", NOW + 30_000, { context: "special" }),
			review("cd-49-jepang", "special2holder", later, { context: "special" })
		]);
		expect(state.tier.days.get(laterDay)?.capped ?? 0).toBe(0);
	});
	test("learning steps leave the cap alone", () => {
		const state = stateOf(learned("dk"));
		expect(state.tier.days.get(localDay(NOW, WITA))?.capped ?? 0).toBe(0);
	});
});
