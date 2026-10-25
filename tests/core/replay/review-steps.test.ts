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
