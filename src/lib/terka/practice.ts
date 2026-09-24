import {
	applyAnswer,
	dailyQueue,
	finishSession,
	nextQuestion,
	refreshProgress,
	selectScope,
	startSession,
	undoAnswer
} from "./engine";
import type { Content, Progress, Scope, SessionMode } from "./model";

/** Mode is done for today; unlocks again at the next day boundary. */
export function modeDone(progress: Progress, content: Content, mode: SessionMode, now: number) {
	if (now >= progress.clock.nextBoundary) return false;
	if (mode === "daily") return !dailyQueue(progress, content, now).length;
	if (mode === "challenge") return progress.challengeDays.includes(progress.clock.sequence);
	return false;
}

export function beginPractice(
	progress: Progress,
	content: Content,
	mode: SessionMode,
	now: number,
	id: string,
	scope?: Scope
) {
	let next = refreshProgress(progress, content, now);
	let active = next.sessions.findLast((session) => session.completedAt === null);
	// Daily-type sessions may be ended at will, so switching mode closes them first.
	if (active && active.mode !== mode && ["daily", "focused", "set"].includes(active.mode)) {
		next = finishSession(next, now);
		active = undefined;
	}
	if (
		active &&
		!(active.mode === "sprint" && now >= active.startedAt + 60000) &&
		!(active.mode === "challenge" && active.day !== next.clock.sequence)
	)
		return next.currentQuestion || practiceFeedback(next)
			? next
			: nextQuestion(next, content, { id: `${id}-resumed`, now });
	if (mode === "daily" && scope) next = selectScope(next, content, scope);
	next = startSession(next, content, { id, mode, now, scope });
	return nextQuestion(next, content, { id: `${id}-first`, now });
}

export function answerPractice(
	progress: Progress,
	content: Content,
	answers: string[],
	firstKey: number | null,
	now: number,
	id: string
) {
	const session = progress.sessions.findLast((entry) => entry.completedAt === null);
	if (!session || !progress.currentQuestion)
		throw new Error("Soal sudah berubah. Muat ulang sesi.");
	if (session.mode === "sprint" && now >= session.startedAt + 60000)
		return finishSession(progress, now);
	return applyAnswer(progress, content, {
		id,
		sessionId: session.id,
		questionId: progress.currentQuestion.id,
		now,
		msToFirstKey: firstKey,
		answers
	});
}

export function practiceFeedback(progress: Progress) {
	const question = progress.undo?.before.currentQuestion;
	const review = progress.reviews.at(-1);
	if (
		progress.currentQuestion ||
		!question ||
		!review ||
		review.id !== progress.undo?.reviewId ||
		review.sessionId !== progress.sessions.at(-1)?.id
	)
		return null;
	return { question, review };
}

export function undoPractice(progress: Progress, now: number) {
	const result = undoAnswer(progress);
	// A restored question gets a fresh response window; its previous review was removed.
	if (result.currentQuestion) result.currentQuestion.shownAt = now;
	return result;
}

export function scopeName(content: Content, scope: Scope): string {
	if (scope.level === "national") return "Seluruh Indonesia";
	if (scope.id === "bali-nusra") return "Bali & Nusa Tenggara";
	return scope.id
		.split("-")
		.map((word) => word[0].toUpperCase() + word.slice(1))
		.join(" ");
}

export const percent = (value: number | null) =>
	value === null ? "—" : `${Math.round(value * 100)}%`;
export const dateLabel = (value: number | null) =>
	value === null ? "Belum pernah" : new Date(value).toLocaleString("id-ID");
export const modeNames: Record<SessionMode, string> = {
	daily: "Belajar harian",
	focused: "Latihan Terfokus",
	set: "Sebutkan Wilayah",
	challenge: "Tantangan Harian",
	sprint: "Mode Kilat"
};
