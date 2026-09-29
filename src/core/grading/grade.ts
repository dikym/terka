import { comparisonGroup, fluencyScore, isInterrupted } from "./fluency";
import type { AnswerSignals, Grade } from "./signals";

const PLACEMENT_FAST_MS = 3000;

// SRD 5.2 rule 8.
export function gradeSet(setCorrect: number, setThreshold: number): Grade {
	if (setCorrect === 0) return 1;
	if (setCorrect < setThreshold) return 2;
	return setCorrect >= setThreshold + 2 ? 4 : 3;
}

// SRD 4.4 "Pemetaan ke nilai penjadwalan jawaban tunggal"; null = not graded.
export function gradeAnswer(signals: AnswerSignals, history: AnswerSignals[]): Grade | null {
	if (
		signals.context === "intro" ||
		signals.questionType === "intro_read" ||
		signals.matchType === "unverified"
	)
		return null;
	if (signals.questionType === "setrecall") {
		if (signals.setCorrect === null || signals.setThreshold === null)
			throw new Error("setrecall answers need setCorrect and setThreshold");
		return gradeSet(signals.setCorrect, signals.setThreshold);
	}
	if (signals.correct !== true || signals.timedOut) return 1;
	if (isInterrupted(signals)) return 3;
	const score = fluencyScore(signals, comparisonGroup(signals, history));
	return score >= 2 ? 4 : score >= 0 ? 3 : 2;
}

// SRD 4.13 "Dampak ke kartu": only a clean correct answer seeds the card.
export function gradePlacement(signals: AnswerSignals): Grade | null {
	if (signals.correct !== true || signals.timedOut || isInterrupted(signals)) return null;
	const fast = signals.msToFirstKey !== null && signals.msToFirstKey < PLACEMENT_FAST_MS;
	return fast && (signals.matchType === "exact" || signals.matchType === "variant") ? 4 : 3;
}
