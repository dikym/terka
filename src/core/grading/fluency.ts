import type { AnswerSignals } from "./signals";

const WINDOW = 200;
const MIN_SAMPLES = 30;
const INTERRUPTED_LATENCY_MS = 60_000;
const LONG_GAP_MS = 1200;
const DELETED_SHARE = 0.3;

export function percentile(values: number[], fraction: number): number {
	const sorted = [...values].sort((a, b) => a - b);
	const index = (sorted.length - 1) * fraction;
	const lower = Math.floor(index);
	return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

export const isInterrupted = (signals: AnswerSignals) =>
	signals.interrupted ||
	(signals.msToFirstKey !== null && signals.msToFirstKey > INTERRUPTED_LATENCY_MS);

// SRD 4.4 "Yang tidak masuk persentil".
export const isPercentileSample = (signals: AnswerSignals) =>
	signals.context !== "intro" &&
	signals.context !== "placement" &&
	signals.questionType !== "intro_read" &&
	signals.questionType !== "setrecall" &&
	signals.correct === true &&
	!signals.timedOut &&
	!isInterrupted(signals) &&
	signals.matchType !== "unverified" &&
	signals.levelSource !== "manual_down" &&
	signals.msToFirstKey !== null;

// level × answer form × input method, falling back to level × input method below 30 samples.
export function comparisonGroup(signals: AnswerSignals, history: AnswerSignals[]): AnswerSignals[] {
	const samples = history.filter(
		(item) =>
			isPercentileSample(item) &&
			item.level === signals.level &&
			item.inputMode === signals.inputMode
	);
	const narrow = samples.filter((item) => item.answerForm === signals.answerForm).slice(-WINDOW);
	if (narrow.length >= MIN_SAMPLES) return narrow;
	const wide = samples.slice(-WINDOW);
	return wide.length >= MIN_SAMPLES ? wide : [];
}

const msPerChar = (signals: AnswerSignals) =>
	signals.msTyping !== null && signals.answerLength > 0
		? signals.msTyping / signals.answerLength
		: null;
const longestGap = (signals: AnswerSignals) =>
	signals.keyGapsMs?.length ? Math.max(...signals.keyGapsMs) : null;
const present = (values: (number | null)[]) =>
	values.filter((value): value is number => value !== null);

// SRD 4.4 "Skor kelancaran".
export function fluencyScore(signals: AnswerSignals, group: AnswerSignals[]): number {
	let score = 0;
	if (group.length) {
		const latencies = present(group.map((item) => item.msToFirstKey));
		if (signals.msToFirstKey !== null) {
			if (signals.msToFirstKey < percentile(latencies, 0.2)) score += 2;
			else if (signals.msToFirstKey > percentile(latencies, 0.8)) score -= 2;
		}
		const speed = msPerChar(signals);
		const speeds = present(group.map(msPerChar));
		if (speed !== null && speeds.length && speed > percentile(speeds, 0.8)) score -= 1;
		const gap = longestGap(signals);
		const gaps = present(group.map(longestGap));
		if (gap !== null && gaps.length && gap > percentile(gaps, 0.9) && gap > LONG_GAP_MS)
			score -= 1;
	}
	if (signals.answerLength > 0 && signals.deletedChars >= DELETED_SHARE * signals.answerLength)
		score -= 1;
	if (signals.matchType === "typo") score -= 1;
	if (signals.optionChanges >= 1) score -= 1;
	return score;
}
