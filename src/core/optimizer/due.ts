import {
	OPTIMIZE_AGAIN_DAYS,
	OPTIMIZE_AGAIN_REVIEWS,
	OPTIMIZE_FIRST_CARDS,
	OPTIMIZE_FIRST_REVIEWS
} from "@/rules";
import type { FsrsParams } from "../log/events";
import type { CountedAnswer } from "./counted";

const DAY_MS = 86_400_000;

type Requirement = { have: number; need: number };

// `cards` applies only before the first run, `days` only after it.
export type OptimizationProgress = {
	reviews: Requirement;
	cards: Requirement | null;
	days: Requirement | null;
};

// Any earlier result counts, rejected or from another device, so devices do not repeat each other's run.
export function optimizationProgress(
	counted: readonly CountedAnswer[],
	rows: readonly FsrsParams[],
	now: number
): OptimizationProgress {
	if (rows.length === 0)
		return {
			reviews: { have: counted.length, need: OPTIMIZE_FIRST_REVIEWS },
			cards: {
				have: new Set(counted.map((answer) => answer.cardId)).size,
				need: OPTIMIZE_FIRST_CARDS
			},
			days: null
		};
	const last = Math.max(...rows.map((row) => row.createdAt));
	return {
		reviews: {
			have: counted.filter((answer) => answer.at > last).length,
			need: OPTIMIZE_AGAIN_REVIEWS
		},
		cards: null,
		days: { have: Math.floor((now - last) / DAY_MS), need: OPTIMIZE_AGAIN_DAYS }
	};
}

export function optimizationDue(
	counted: readonly CountedAnswer[],
	rows: readonly FsrsParams[],
	now: number
): boolean {
	const progress = optimizationProgress(counted, rows, now);
	return [progress.reviews, progress.cards, progress.days].every(
		(requirement) => requirement === null || requirement.have >= requirement.need
	);
}
