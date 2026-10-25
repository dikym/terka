import { LEECH_LAPSES, MATURE_INTERVAL_DAYS, SUSPEND_LAPSES } from "@/rules";
import type { Grade } from "../grading/signals";
import type { CardMemory, SuspensionReason } from "./card-memory";
import { nextMemory, type Scheduler } from "./fsrs";
import { fuzzDays } from "./fuzz";
import { addDays, dayStart } from "../time/day";

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

export function introduce(card: CardMemory, at: number): CardMemory {
	if (card.state !== "new") throw new Error(`${card.cardId} is not new`);
	return { ...card, state: "learning", step: 1, due: at };
}

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

// A leech resets only D, S and lapses; its history (reps, passedLevel3) stays.
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

// The caller has already decided this answer may change the schedule.
export function answer(input: CardMemory, grade: Grade, ctx: AnswerContext): CardMemory {
	if (!["learning", "relearning", "review", "mature"].includes(input.state))
		throw new Error(`${input.cardId}: cannot answer a ${input.state} card`);
	const steps = input.state === "learning" || input.state === "relearning";
	const newDay = input.scheduledDay !== ctx.localDay;
	if (!newDay && !steps) {
		// A Level 3 pass is recorded even when the schedule does not change.
		if (ctx.passesLevel3 && !input.passedLevel3) return { ...input, passedLevel3: true };
		return input;
	}
	let card: CardMemory = newDay ? updateMemory(input, grade, ctx) : { ...input };
	card = { ...card, reps: input.reps + 1, passedLevel3: input.passedLevel3 || ctx.passesLevel3 };
	const settle = (): CardMemory => ({
		...card,
		state: "review",
		step: 0,
		due: Math.max(dayStart(addDays(ctx.localDay, 1), ctx.tz), card.pendingDue ?? 0),
		pendingDue: null
	});
	if (input.state === "learning" || input.state === "relearning") {
		card = settle();
	} else if (grade === 1) {
		card = {
			...card,
			state: "relearning",
			lapses: input.lapses + 1,
			due: ctx.at
		};
	} else {
		// A mature card leaves that state only on a wrong answer.
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
