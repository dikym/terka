import {
	OPTIMIZE_AGAIN_DAYS,
	OPTIMIZE_AGAIN_REVIEWS,
	OPTIMIZE_FIRST_CARDS,
	OPTIMIZE_FIRST_REVIEWS
} from "@/rules";
import type { FsrsParams } from "../log/events";
import type { CountedAnswer } from "./counted";

const DAY_MS = 86_400_000;

// Any earlier result counts, rejected or from another device, so devices do not repeat each other's run.
export function optimizationDue(
	counted: readonly CountedAnswer[],
	rows: readonly FsrsParams[],
	now: number
): boolean {
	if (rows.length === 0)
		return (
			counted.length >= OPTIMIZE_FIRST_REVIEWS &&
			new Set(counted.map((answer) => answer.cardId)).size >= OPTIMIZE_FIRST_CARDS
		);
	const last = Math.max(...rows.map((row) => row.createdAt));
	return (
		counted.filter((answer) => answer.at > last).length >= OPTIMIZE_AGAIN_REVIEWS &&
		now - last >= OPTIMIZE_AGAIN_DAYS * DAY_MS
	);
}
