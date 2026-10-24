import { describe, expect, test } from "bun:test";
import { default_w } from "ts-fsrs";
import { rollbackDraft } from "../../../src/core/optimizer/rollback";
import { answers, DAY, NOW, paramsRow } from "./fixtures";

const previous = paramsRow({
	id: "row-0",
	weights: Array.from({ length: 21 }, () => 1),
	createdAt: NOW - 60 * DAY,
	activatedAt: NOW - 60 * DAY
});
const current = paramsRow({ id: "row-1", createdAt: NOW, activatedAt: NOW });
const after = (count: number, retention: number) =>
	answers(count, 100, {
		from: NOW + 1,
		correct: (index) => index % 100 < Math.round(retention * 100)
	});
const now = NOW + 400 * 3_600_000;

describe("rollbackDraft", () => {
	test("restores the previous weights when retention misses the target by more than 5 points", async () => {
		const draft = (await rollbackDraft(after(300, 0.83), [previous, current], now))!;
		expect(draft).toMatchObject({
			weights: previous.weights,
			status: "active",
			activatedAt: now,
			createdAt: now,
			trainedReviewCount: 300,
			logloss: current.baselineLogloss,
			rmse: current.baselineRmse,
			baselineLogloss: current.logloss,
			baselineRmse: current.rmse
		});
		expect(draft.trainingEventIds).toHaveLength(300);
	});

	test("restores the default weights when no earlier row exists", async () => {
		const draft = (await rollbackDraft(after(300, 0.83), [current], now))!;
		expect(draft.weights).toEqual([...default_w]);
	});

	test("keeps parameters within 5 points", async () => {
		expect(await rollbackDraft(after(300, 0.86), [previous, current], now)).toBeNull();
	});

	test("keeps parameters exactly 5 points away", async () => {
		expect(await rollbackDraft(after(300, 0.85), [previous, current], now)).toBeNull();
	});

	test("does not judge before 300 answers", async () => {
		expect(await rollbackDraft(after(299, 0.8), [previous, current], now)).toBeNull();
	});

	test("judges only the first 300 answers after activation", async () => {
		const later = answers(300, 100, { from: NOW + 400 * 3_600_000 }).map((answer, index) => ({
			...answer,
			id: `later-${index}`,
			correct: false
		}));
		expect(
			await rollbackDraft([...after(300, 0.9), ...later], [previous, current], now)
		).toBeNull();
	});

	test("never rolls back a rollback", async () => {
		const restored = paramsRow({
			id: "row-2",
			weights: previous.weights,
			createdAt: NOW + 1,
			activatedAt: NOW + 1,
			logloss: current.baselineLogloss,
			baselineLogloss: current.logloss
		});
		expect(
			await rollbackDraft(after(300, 0.5), [previous, current, restored], now + DAY)
		).toBeNull();
	});
});
