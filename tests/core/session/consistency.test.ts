import { expect, test } from "bun:test";
import { effectiveTs } from "../../../src/core/log/order";
import { append } from "../../../src/core/replay/replay";
import { dailyQueue } from "../../../src/core/session/queue";
import { HOUR, review, ruleBundle, stateOf } from "../replay/fixtures";
import { randomLog } from "../replay/generator";
import { ctxAt, SETTINGS } from "./fixtures";

test("every queued step and review is an answer replay will count for the schedule", () => {
	for (const seed of ["one", "two", "three", "four", "five"]) {
		const events = randomLog(seed, 400, { voids: true });
		const state = stateOf(events);
		const now = Math.max(...events.map(effectiveTs)) + HOUR;
		const { items } = dailyQueue(state, ruleBundle(), SETTINGS, ctxAt(now));
		for (const item of items.filter(
			(entry) => entry.slot === "step" || entry.slot === "review"
		)) {
			const [contentId, mode] = item.cardId.split("::") as [
				string,
				"code2region" | "region2code"
			];
			const result = append(state, [review(contentId, mode, now, { context: "daily" })]);
			if (result === "full" || result.status !== "ok")
				throw new Error(`append refused for ${seed}`);
			expect(result.state.cards.get(item.cardId)!.reps).toBe(
				state.cards.get(item.cardId)!.reps + 1
			);
		}
	}
});
