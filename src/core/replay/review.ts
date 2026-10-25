import { UNLOCK_REVERSE_DAYS, UNLOCK_SET_DAYS } from "@/rules";
import { gradePlacement, gradeWithGroup } from "../grading/grade";
import type { ReviewLog } from "../log/events";
import {
	answer,
	type AnswerContext,
	introduce,
	isLeech,
	seedFromPlacement,
	unlock
} from "../scheduling/card";
import { dayStats } from "./days";
import { schedulerAt } from "./params";
import { confusionsOf, recordConfusion, recordDrill } from "./pairs";
import { fluencyGroup, recordSample, toSignals } from "./samples";
import { type AppState, type CardEntry, newEntry, putCard } from "./state";
import { trackOf } from "./universe";

const STEPS = new Set<string>(["learning", "relearning"]);
const LEARNED = new Set<string>(["learning", "relearning", "review", "mature"]);
const SETTLED = new Set<string>(["review", "mature"]);

const answerContext = (
	state: AppState,
	row: ReviewLog,
	at: number,
	passesLevel3: boolean
): AnswerContext => ({
	at,
	localDay: row.localDay,
	tz: row.tz,
	answerId: row.id,
	scheduler: schedulerAt(state.params, at),
	loadOn: (day) => state.dueByDay.get(day) ?? 0,
	passesLevel3
});

function unlockRelated(state: AppState, card: CardEntry, tz: string) {
	const [contentId, mode] = card.cardId.split("::");
	const open = (target: string, ready: boolean) => {
		const other = state.cards.get(`${contentId}::${target}`);
		if (ready && other?.state === "locked") putCard(state, other, unlock(other), tz);
	};
	if (mode === "code2region") {
		open("region2code", card.intervalDays >= UNLOCK_REVERSE_DAYS);
		open("setrecall", card.intervalDays >= UNLOCK_SET_DAYS);
	}
	if (mode === "special2holder") open("holder2special", card.intervalDays >= UNLOCK_REVERSE_DAYS);
}

function afterAnswer(state: AppState, row: ReviewLog, cardId: string, valid: boolean) {
	const card = state.cards.get(cardId)!;
	const passedLevels: CardEntry["passedLevels"] = [...card.passedLevels];
	if (valid) passedLevels[row.level - 1] = true;
	const graded = row.correct !== null;
	state.cards.set(cardId, {
		...card,
		passedLevels,
		answered: card.answered + (graded ? 1 : 0),
		wrong: card.wrong + (row.correct === false ? 1 : 0)
	});
	state.activeDays.add(row.localDay);
	for (const other of confusionsOf(row))
		recordConfusion(state, row.contentId, other, row.localDay);
	if (row.context === "drill" && row.drillPairWith)
		recordDrill(state, row.contentId, row.drillPairWith, row.correct === true, row.localDay);
}

// Re-asks repeat a planned card, so a run is done only once every distinct planned card is answered.
function recordRunCard(state: AppState, runId: string | null, cardId: string) {
	if (runId === null) return;
	const run = state.dailyRuns.get(runId);
	if (!run) return;
	run.cards.add(cardId);
	if (run.cards.size < run.plannedCount) return;
	state.doneDays.add(run.localDay);
	state.dailyRuns.delete(runId);
}

export function applyReview(state: AppState, row: ReviewLog, at: number): void {
	if (state.voided.has(row.id)) return;
	if (row.context === "placement" && row.runId !== state.placementRunId) return;
	const cardId = `${row.contentId}::${row.mode}`;
	recordRunCard(state, row.runId, cardId);
	const card = state.cards.get(cardId) ?? newEntry(cardId);
	state.cards.set(cardId, card);
	const contentOk = state.content.get(row.contentId) === "ok";
	const signals = toSignals(row, row.context !== "intro" && isLeech(card));
	recordSample(state, row, signals);

	if (row.context === "intro") {
		if (card.state !== "new") return;
		putCard(state, card, introduce(card, at), row.tz);
		const quotaKey = `${trackOf(row.mode)}|${row.localDay}`;
		state.quota.set(quotaKey, (state.quota.get(quotaKey) ?? 0) + 1);
		state.introDay.set(row.contentId, row.localDay);
		return;
	}

	const valid =
		row.correct === true &&
		row.matchType !== "unverified" &&
		!row.timedOut &&
		!signals.assisted &&
		contentOk &&
		card.state !== "suspended";

	if (row.context === "placement") {
		const grade = gradePlacement(signals);
		if (grade !== null && card.state === "new") {
			const seeded = putCard(
				state,
				card,
				seedFromPlacement(card, grade as 3 | 4, answerContext(state, row, at, false)),
				row.tz
			);
			unlockRelated(state, seeded, row.tz);
		}
		afterAnswer(state, row, cardId, valid);
		return;
	}

	const active = LEARNED.has(card.state) && contentOk;
	const step = STEPS.has(card.state);
	const passesLevel3 = row.level === 3 && valid;
	const eligible =
		active &&
		row.context !== "challenge" &&
		row.context !== "kilat" &&
		card.due <= at &&
		row.levelSource !== "manual_down" &&
		(step || state.groupDay.get(row.contentId) !== row.localDay);
	const grade = eligible ? gradeWithGroup(signals, fluencyGroup(state, signals)) : null;

	if (grade !== null) {
		const next = putCard(
			state,
			card,
			answer(card, grade, answerContext(state, row, at, passesLevel3)),
			row.tz
		);
		state.counted?.push({
			id: row.id,
			cardId,
			at,
			localDay: row.localDay,
			grade,
			settled: SETTLED.has(card.state),
			correct: row.correct === true,
			serverSeq: row.serverSeq,
			msTotal: row.msTotal
		});
		if (!step) state.groupDay.set(row.contentId, row.localDay);
		if (state.firstCountedDay === null) state.firstCountedDay = row.localDay;
		if (SETTLED.has(card.state)) {
			const stats = dayStats(state, row.localDay);
			stats.reviews++;
			if (row.correct === true) stats.reviewsCorrect++;
		}
		unlockRelated(state, next, row.tz);
	} else if (active && passesLevel3 && !card.passedLevel3) {
		state.cards.set(cardId, { ...card, passedLevel3: true });
	}
	afterAnswer(state, row, cardId, valid);
}
