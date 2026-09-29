import { TARGET_RETENTION } from "../../rules";
import { createEmptyCard, fsrs, State, type Card, type Grade as FsrsGrade } from "ts-fsrs";
import type { Grade } from "../grading/signals";
import type { CardMemory } from "./card-memory";

export type Scheduler = ReturnType<typeof fsrs>;

export function createScheduler(weights?: readonly number[]): Scheduler {
	return fsrs({
		request_retention: TARGET_RETENTION,
		enable_fuzz: false,
		enable_short_term: false,
		...(weights ? { w: [...weights] } : {})
	});
}

function toFsrsCard(card: CardMemory): Card {
	return {
		...createEmptyCard(new Date(card.due)),
		due: new Date(card.due),
		state: card.stability === 0 ? State.New : State.Review,
		stability: card.stability,
		difficulty: card.difficulty,
		reps: card.reps,
		lapses: card.lapses,
		scheduled_days: card.intervalDays,
		...(card.lastReviewAt === null ? {} : { last_review: new Date(card.lastReviewAt) })
	};
}

export function retrievability(scheduler: Scheduler, card: CardMemory, at: number): number {
	if (card.lastReviewAt === null || card.stability === 0) return 0;
	return scheduler.get_retrievability(toFsrsCard(card), new Date(at), false);
}

export function nextMemory(scheduler: Scheduler, card: CardMemory, grade: Grade, at: number) {
	const result = scheduler.next(toFsrsCard(card), new Date(at), grade as FsrsGrade).card;
	return {
		stability: result.stability,
		difficulty: result.difficulty,
		scheduledDays: result.scheduled_days
	};
}
