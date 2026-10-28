import {
	DELETED_SHARE,
	FLUENCY_MIN_SAMPLES,
	FLUENCY_WINDOW,
	INTERRUPTED_LATENCY_MS,
	LONG_GAP_MS
} from "@/rules";
import type { AnswerSignals } from "./signals";

const ascending = (values: number[]) => [...values].sort((a, b) => a - b);

function quantile(sorted: number[], fraction: number): number {
	const index = (sorted.length - 1) * fraction;
	const lower = Math.floor(index);
	return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

export const percentile = (values: number[], fraction: number): number =>
	quantile(ascending(values), fraction);

export const isInterrupted = (signals: AnswerSignals) =>
	signals.interrupted ||
	(signals.msToFirstKey !== null && signals.msToFirstKey > INTERRUPTED_LATENCY_MS);

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

export const narrowKey = (signals: AnswerSignals) =>
	`${signals.level}|${signals.inputMode}|${signals.answerForm}`;
// Choices are answered far faster than typing, so they never share a group even at the same level.
export const wideKey = (signals: AnswerSignals) =>
	`${signals.level}|${signals.inputMode}${signals.answerForm === "choice" ? "|choice" : ""}`;

export function pickGroup(narrow: AnswerSignals[], wide: AnswerSignals[]): AnswerSignals[] {
	if (narrow.length >= FLUENCY_MIN_SAMPLES) return narrow;
	return wide.length >= FLUENCY_MIN_SAMPLES ? wide : [];
}

export function comparisonGroup(signals: AnswerSignals, history: AnswerSignals[]): AnswerSignals[] {
	const samples = history.filter(
		(item) => isPercentileSample(item) && wideKey(item) === wideKey(signals)
	);
	return pickGroup(
		samples.filter((item) => item.answerForm === signals.answerForm).slice(-FLUENCY_WINDOW),
		samples.slice(-FLUENCY_WINDOW)
	);
}

const msPerChar = (signals: AnswerSignals) =>
	signals.msTyping !== null && signals.answerLength > 0
		? signals.msTyping / signals.answerLength
		: null;
const longestGap = (signals: AnswerSignals) =>
	signals.keyGapsMs?.length ? Math.max(...signals.keyGapsMs) : null;
const present = (values: (number | null)[]) =>
	values.filter((value): value is number => value !== null);

export function fluencyScore(signals: AnswerSignals, group: AnswerSignals[]): number {
	let score = 0;
	if (group.length) {
		const latencies = present(group.map((item) => item.msToFirstKey));
		if (signals.msToFirstKey !== null) {
			const sorted = ascending(latencies);
			if (signals.msToFirstKey < quantile(sorted, 0.2)) score += 2;
			else if (signals.msToFirstKey > quantile(sorted, 0.8)) score -= 2;
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
