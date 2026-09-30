import { FLUENCY_WINDOW } from "@/rules";
import {
	isInterrupted,
	isPercentileSample,
	narrowKey,
	pickGroup,
	wideKey
} from "../grading/fluency";
import type { AnswerSignals } from "../grading/signals";
import type { ReviewLog } from "../log/events";
import type { AppState } from "./state";

export function answerForm(
	row: Pick<ReviewLog, "mode" | "questionType">
): AnswerSignals["answerForm"] {
	if (
		row.questionType === "choice" ||
		row.questionType === "truefalse" ||
		row.questionType === "oddoneout"
	)
		return "choice";
	return row.mode === "region2code" || row.mode === "holder2special" ? "code" : "name";
}

export const toSignals = (row: ReviewLog, assisted: boolean): AnswerSignals => ({
	context: row.context,
	level: row.level,
	levelSource: row.levelSource,
	questionType: row.questionType,
	answerForm: answerForm(row),
	inputMode: row.inputMode,
	correct: row.correct,
	timedOut: row.timedOut,
	interrupted: row.interrupted,
	matchType: row.matchType,
	typoCost: row.typoCost,
	msToFirstKey: row.msToFirstKey,
	msTotal: row.msTotal,
	msTyping: row.msTyping,
	keyGapsMs: row.keyGapsMs,
	deletedChars: row.deletedChars,
	optionChanges: row.optionChanges,
	answerLength: row.rawAnswer?.length ?? 0,
	assisted,
	setCorrect: row.setCorrect,
	setThreshold: row.setThreshold
});

export const durationKey = (row: Pick<ReviewLog, "questionType" | "level" | "inputMode">) =>
	`${row.questionType}|${row.level}|${row.inputMode}`;

function push<T>(map: Map<string, T[]>, key: string, value: T) {
	const list = map.get(key) ?? [];
	list.push(value);
	if (list.length > FLUENCY_WINDOW) list.shift();
	map.set(key, list);
}

export function recordSample(state: AppState, row: ReviewLog, signals: AnswerSignals): void {
	if (isPercentileSample(signals)) {
		push(state.narrow, narrowKey(signals), signals);
		push(state.wide, wideKey(signals), signals);
	}
	if (!isInterrupted(signals)) push(state.durations, durationKey(row), row.msTotal);
}

export const fluencyGroup = (state: AppState, signals: AnswerSignals) =>
	pickGroup(state.narrow.get(narrowKey(signals)) ?? [], state.wide.get(wideKey(signals)) ?? []);
