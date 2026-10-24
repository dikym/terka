import { describe, expect, test } from "bun:test";
import { default_w } from "ts-fsrs";
import { accepts, decide } from "../../../src/core/optimizer/decide";
import type { Trainer } from "../../../src/core/optimizer/items";
import { trainingSetHash } from "../../../src/core/optimizer/hash";
import { answers, DAY, NOW, paramsRow } from "./fixtures";

const base = { baselineLogloss: 0.5, baselineRmse: 0.1 };
const trained = Array.from({ length: 21 }, () => 0.5);

function fakeTrainer(better: boolean): Trainer & { evaluated: number[][] } {
	const evaluated: number[][] = [];
	return {
		version: "fake@1",
		evaluated,
		train: async () => trained,
		evaluate: async (weights) => {
			evaluated.push([...weights]);
			const isNew = weights === trained;
			return isNew === better ? { logLoss: 0.4, rmse: 0.05 } : { logLoss: 0.5, rmse: 0.1 };
		}
	};
}

describe("accepts", () => {
	test("takes a 1.2 percent log loss drop with equal RMSE", () => {
		expect(accepts({ ...base, logloss: 0.494, rmse: 0.1 })).toBe(true);
	});
	test("takes exactly 1 percent", () => {
		expect(accepts({ ...base, logloss: 0.495, rmse: 0.1 })).toBe(true);
	});
	test("refuses a 0.8 percent drop", () => {
		expect(accepts({ ...base, logloss: 0.496, rmse: 0.1 })).toBe(false);
	});
	test("refuses a 2 percent drop with a worse RMSE", () => {
		expect(accepts({ ...base, logloss: 0.49, rmse: 0.101 })).toBe(false);
	});
});

describe("decide", () => {
	const counted = answers(1_200, 240, { correct: (index) => index % 10 !== 0 });
	const now = NOW + 1_300 * 3_600_000;

	test("does nothing while the log is too small", async () => {
		expect(
			await decide({ counted: answers(999, 300), rows: [], now }, fakeTrainer(true))
		).toBeNull();
	});

	test("activates better parameters with the identity of the data used", async () => {
		const draft = (await decide({ counted, rows: [], now }, fakeTrainer(true)))!;
		const ids = counted.map((answer) => answer.id).sort();
		expect(draft).toMatchObject({
			algorithm: "fsrs-6",
			libraryVersion: "fake@1",
			weights: trained,
			status: "active",
			activatedAt: now,
			createdAt: now,
			trainedReviewCount: 1_200,
			trainedThroughSeq: 1_200,
			trainingEventIds: ids,
			logloss: 0.4,
			rmse: 0.05,
			baselineLogloss: 0.5,
			baselineRmse: 0.1
		});
		expect(draft.trainingSetHash).toBe(await trainingSetHash(ids));
	});

	test("keeps the decision as rejected when the new parameters are not better", async () => {
		const draft = (await decide({ counted, rows: [], now }, fakeTrainer(false)))!;
		expect(draft).toMatchObject({ status: "rejected", activatedAt: null });
	});

	test("leaves the server sequence empty when an answer has not synced", async () => {
		const unsynced = counted.map((answer, index) =>
			index === 5 ? { ...answer, serverSeq: null } : answer
		);
		const draft = (await decide({ counted: unsynced, rows: [], now }, fakeTrainer(true)))!;
		expect(draft.trainedThroughSeq).toBeNull();
	});

	test("refuses non-finite weights instead of writing a row the server would reject", async () => {
		const broken = { ...fakeTrainer(true), train: async () => [NaN, ...trained.slice(1)] };
		await expect(decide({ counted, rows: [], now }, broken)).rejects.toThrow("non-finite");
	});

	test("refuses non-finite metrics", async () => {
		const broken = {
			...fakeTrainer(true),
			evaluate: async () => ({ logLoss: Number.POSITIVE_INFINITY, rmse: 0.1 })
		};
		await expect(decide({ counted, rows: [], now }, broken)).rejects.toThrow("non-finite");
	});

	test("compares against the default weights before any active row", async () => {
		const trainer = fakeTrainer(true);
		await decide({ counted, rows: [], now }, trainer);
		expect(trainer.evaluated).toContainEqual([...default_w]);
	});

	test("rolls back before it considers a new optimization", async () => {
		const current = paramsRow({ createdAt: NOW - 40 * DAY, activatedAt: NOW - 40 * DAY });
		const missed = counted.map((answer) => ({ ...answer, correct: false }));
		const draft = (await decide({ counted: missed, rows: [current], now }, fakeTrainer(true)))!;
		expect(draft.trainedReviewCount).toBe(300);
		expect(draft.logloss).toBe(current.baselineLogloss);
	});

	test("compares against the weights active now", async () => {
		const current = paramsRow({ createdAt: NOW - 40 * DAY, activatedAt: NOW - 40 * DAY });
		const trainer = fakeTrainer(true);
		await decide({ counted, rows: [current], now }, trainer);
		expect(trainer.evaluated).toContainEqual(current.weights);
	});
});
