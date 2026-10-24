import { describe, expect, test } from "bun:test";
import { buildItems, splitByTime } from "../../../src/core/optimizer/items";
import { answers, DAY, NOW } from "./fixtures";

describe("buildItems", () => {
	test("counts whole local days between a card's reviews and emits one item per later review", () => {
		const [first, second, third] = answers(3, 1);
		const items = buildItems([
			{ ...third, at: NOW + 3 * DAY, localDay: "2026-09-24", grade: 1 },
			first,
			second
		]);
		expect(items).toEqual([
			{
				cardId: first.cardId,
				lastAt: second.at,
				reviews: [
					{ rating: 3, deltaT: 0 },
					{ rating: 3, deltaT: 0 }
				]
			},
			{
				cardId: first.cardId,
				lastAt: NOW + 3 * DAY,
				reviews: [
					{ rating: 3, deltaT: 0 },
					{ rating: 3, deltaT: 0 },
					{ rating: 1, deltaT: 3 }
				]
			}
		]);
	});

	test("emits nothing for a card reviewed once", () => {
		expect(buildItems(answers(1, 1))).toEqual([]);
	});
});

describe("splitByTime", () => {
	test("trains on the oldest 80 percent and tests on the newest", () => {
		const items = buildItems(answers(20, 2)).reverse();
		const { train, test: held } = splitByTime(items);
		expect(train).toHaveLength(Math.floor(items.length * 0.8));
		expect(held).toHaveLength(items.length - train.length);
		expect(Math.max(...train.map((item) => item.lastAt))).toBeLessThan(
			Math.min(...held.map((item) => item.lastAt))
		);
	});
});
