import { expect, test } from "bun:test";
import { dailyQueue } from "../../../src/core/session/queue";
import { DAY, fresh, manyRegions, NOW, reviewCard, seedCard } from "../replay/fixtures";
import { ctxAt, SETTINGS } from "./fixtures";

test("building the daily queue over 1,000 due cards stays under 50 ms", () => {
	const bundle = manyRegions(1_000);
	const state = fresh(bundle);
	let due = 0;
	for (const cardId of state.cards.keys())
		if (cardId.endsWith("::code2region")) {
			seedCard(state, cardId, reviewCard({ due: NOW - (due++ % 5) * DAY }));
		}
	expect(due).toBeGreaterThanOrEqual(1_000);
	const timings = Array.from({ length: 5 }, () => {
		const started = performance.now();
		dailyQueue(state, bundle, SETTINGS, ctxAt(NOW));
		return performance.now() - started;
	});
	expect(Math.min(...timings)).toBeLessThan(50);
});
