import { DRILL_CLEAR_STREAK, PAIR_RETHRESHOLD, PAIR_THRESHOLD, PAIR_WINDOW_DAYS } from "@/rules";
import type { ReviewLog } from "../log/events";
import { dayNumber } from "../time/day";
import type { AppState, PairState } from "./state";

export const pairKey = (from: string, to: string) => `${from}>${to}`;

export function confusionsOf(row: ReviewLog): string[] {
	if (row.setItems)
		return [
			...new Set(
				row.setItems.map((item) => item[4]).filter((id): id is string => id !== null)
			)
		];
	return row.correct === false && row.confusedWith ? [row.confusedWith] : [];
}

export function recordConfusion(state: AppState, from: string, to: string, localDay: string): void {
	if (from === to) return;
	const key = pairKey(from, to);
	const pair: PairState = state.pairs.get(key) ?? {
		occurrences: [],
		flagged: false,
		cleared: false,
		drillStreak: 0,
		drillDay: null
	};
	const today = dayNumber(localDay);
	const occurrences = [...pair.occurrences, localDay].filter(
		(day) => today - dayNumber(day) < PAIR_WINDOW_DAYS
	);
	const threshold = pair.cleared ? PAIR_RETHRESHOLD : PAIR_THRESHOLD;
	state.pairs.set(key, {
		...pair,
		occurrences,
		flagged: pair.flagged || occurrences.length >= threshold
	});
}

// Clearing forgets old occurrences, so only confusions after the clear count toward the lower threshold.
export function recordDrill(
	state: AppState,
	from: string,
	to: string,
	correct: boolean,
	localDay: string
): void {
	const key = pairKey(from, to);
	const pair = state.pairs.get(key);
	if (!pair?.flagged || pair.drillDay === localDay) return;
	if (!correct) return void state.pairs.set(key, { ...pair, drillStreak: 0, drillDay: localDay });
	const drillStreak = pair.drillStreak + 1;
	state.pairs.set(
		key,
		drillStreak >= DRILL_CLEAR_STREAK
			? { occurrences: [], flagged: false, cleared: true, drillStreak: 0, drillDay: null }
			: { ...pair, drillStreak, drillDay: localDay }
	);
}
