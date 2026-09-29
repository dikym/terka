import type { Grade } from "../grading/signals";
import type { CardMemory, SuspensionReason } from "./card-memory";
import { nextMemory, type Scheduler } from "./fsrs";
import { fuzzDays } from "./fuzz";

export const MATURE_INTERVAL_DAYS = 21;
export const LEECH_LAPSES = 6;
export const SUSPEND_LAPSES = 8;
const FIRST_STEP_MS = 60_000;
const SECOND_STEP_MS = 600_000;

export type AnswerContext = {
	at: number;
	localDay: string;
	tz: string;
	answerId: string;
	scheduler: Scheduler;
	loadOn: (localDay: string) => number;
	passesLevel3: boolean;
};

export const isLeech = (card: CardMemory) => card.lapses >= LEECH_LAPSES;
export const isDue = (card: CardMemory, at: number) => card.due <= at;

export function unlock(card: CardMemory): CardMemory {
	if (card.state !== "locked") throw new Error(`${card.cardId} is not locked`);
	return { ...card, state: "new" };
}

// SRD 4.7: the first sighting is an ungraded guess; FSRS starts at the 1-minute step.
export function introduce(card: CardMemory, at: number): CardMemory {
	if (card.state !== "new") throw new Error(`${card.cardId} is not new`);
	return { ...card, state: "learning", step: 1, due: at + FIRST_STEP_MS };
}

// One FSRS update per learning day, spread by the load-balanced fuzz.
function updateMemory(
	card: CardMemory,
	grade: Grade,
	ctx: Omit<AnswerContext, "passesLevel3">
): CardMemory {
	const memory = nextMemory(ctx.scheduler, card, grade, ctx.at);
	const fuzz = fuzzDays(memory.scheduledDays, {
		today: ctx.localDay,
		tz: ctx.tz,
		loadOn: ctx.loadOn,
		seed: ctx.answerId
	});
	return {
		...card,
		stability: memory.stability,
		difficulty: memory.difficulty,
		intervalDays: fuzz.days,
		pendingDue: fuzz.due,
		scheduledDay: ctx.localDay,
		lastReviewAt: ctx.at
	};
}

// SRD 4.13: a clean placement answer is the card's first FSRS review.
export function seedFromPlacement(
	card: CardMemory,
	grade: 3 | 4,
	ctx: Omit<AnswerContext, "passesLevel3">
): CardMemory {
	if (card.state !== "new") throw new Error(`${card.cardId} is not new`);
	const next = updateMemory(card, grade, ctx);
	return {
		...next,
		state: "review",
		reps: card.reps + 1,
		due: next.pendingDue ?? ctx.at,
		pendingDue: null
	};
}

export function suspend(card: CardMemory, reason: SuspensionReason): CardMemory {
	if (card.state === "suspended") return card;
	return { ...card, state: "suspended", suspension: { reason, resume: card.state } };
}

// SRD 7: manual and data suspensions resume as-is; SRD 6.4: a leech resets only D, S and
// lapses to new-card values and resumes its prior state — history (reps, passedLevel3) stays.
export function unsuspend(card: CardMemory): CardMemory {
	if (!card.suspension) throw new Error(`${card.cardId} is not suspended`);
	if (card.suspension.reason === "leech")
		return {
			...card,
			state: card.suspension.resume,
			suspension: null,
			stability: 0,
			difficulty: 0,
			lapses: 0
		};
	return { ...card, state: card.suspension.resume, suspension: null };
}

// SRD 4.6 and 7. The caller has already decided this answer may change the schedule.
export function answer(input: CardMemory, grade: Grade, ctx: AnswerContext): CardMemory {
	if (!["learning", "relearning", "review", "mature"].includes(input.state))
		throw new Error(`${input.cardId}: cannot answer a ${input.state} card`);
	const steps = input.state === "learning" || input.state === "relearning";
	const newDay = input.scheduledDay !== ctx.localDay;
	if (!newDay && !steps) {
		// SRD 4.13: a Level 3 pass is historical even on an answer that doesn't touch the schedule.
		if (ctx.passesLevel3 && !input.passedLevel3) return { ...input, passedLevel3: true };
		return input;
	}
	let card: CardMemory = newDay ? updateMemory(input, grade, ctx) : { ...input };
	card = { ...card, reps: input.reps + 1, passedLevel3: input.passedLevel3 || ctx.passesLevel3 };
	const settle = (): CardMemory => ({
		...card,
		state: "review",
		step: 0,
		due: Math.max(ctx.at + 1, card.pendingDue ?? ctx.at + 1),
		pendingDue: null
	});
	if (input.state === "learning") {
		if (grade === 1) card = { ...card, step: 1, due: ctx.at + FIRST_STEP_MS };
		else if (input.step < 2) card = { ...card, step: 2, due: ctx.at + SECOND_STEP_MS };
		else card = settle();
	} else if (input.state === "relearning") {
		card = grade === 1 ? { ...card, due: ctx.at + SECOND_STEP_MS } : settle();
	} else if (grade === 1) {
		card = {
			...card,
			state: "relearning",
			lapses: input.lapses + 1,
			due: ctx.at + SECOND_STEP_MS
		};
	} else {
		// SRD 7: mature only leaves that state on a wrong answer; a correct one keeps it mature.
		card = {
			...card,
			state: input.state === "mature" ? "mature" : "review",
			due: card.pendingDue ?? card.due,
			pendingDue: null
		};
	}
	if (card.state === "review" && card.intervalDays >= MATURE_INTERVAL_DAYS && card.passedLevel3)
		card = { ...card, state: "mature" };
	return card.lapses >= SUSPEND_LAPSES ? suspend(card, "leech") : card;
}
