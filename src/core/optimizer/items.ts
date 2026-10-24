import { OPTIMIZE_TEST_SHARE } from "@/rules";
import type { Grade } from "../grading/signals";
import { dayNumber } from "../time/day";
import type { CountedAnswer } from "./counted";

// One card's history up to and including the review being predicted.
export type ReviewSeq = {
	cardId: string;
	lastAt: number;
	reviews: { rating: Grade; deltaT: number }[];
};

export type Trainer = {
	version: string;
	train(items: ReviewSeq[]): Promise<number[]>;
	evaluate(
		weights: readonly number[],
		items: ReviewSeq[]
	): Promise<{ logLoss: number; rmse: number }>;
	steps?(revlog: Uint8Array, decay: number): Promise<StepSuggestion>;
};

// Learning and relearning steps in seconds; shown on the diagnostic screen, never applied.
export type StepSuggestion = { learning: number[]; relearning: number[] };

export function buildItems(counted: readonly CountedAnswer[]): ReviewSeq[] {
	const byCard = new Map<string, CountedAnswer[]>();
	for (const answer of [...counted].sort((a, b) => a.at - b.at))
		byCard.set(answer.cardId, [...(byCard.get(answer.cardId) ?? []), answer]);
	const items: ReviewSeq[] = [];
	for (const [cardId, list] of byCard) {
		const reviews: ReviewSeq["reviews"] = [];
		list.forEach((answer, index) => {
			const deltaT =
				index === 0 ? 0 : dayNumber(answer.localDay) - dayNumber(list[index - 1].localDay);
			reviews.push({ rating: answer.grade, deltaT });
			if (index > 0) items.push({ cardId, lastAt: answer.at, reviews: [...reviews] });
		});
	}
	return items;
}

export function splitByTime(items: readonly ReviewSeq[]): {
	train: ReviewSeq[];
	test: ReviewSeq[];
} {
	const sorted = [...items].sort(
		(a, b) => a.lastAt - b.lastAt || (a.cardId < b.cardId ? -1 : a.cardId > b.cardId ? 1 : 0)
	);
	const cut = Math.floor(sorted.length * (1 - OPTIMIZE_TEST_SHARE));
	return { train: sorted.slice(0, cut), test: sorted.slice(cut) };
}
