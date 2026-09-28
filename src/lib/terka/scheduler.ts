import { createEmptyCard, fsrs, State } from "ts-fsrs";
import { gradeAnswer } from "./grading";
import { DAY, type CardProgress, type LearningClock, type RawReview } from "./model";
import { MATURE_INTERVAL_DAYS } from "../../rules";

// Minute steps belong to Terka; FSRS only supplies the daily memory update.
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false });

export function scheduleAnswer(
	input: CardProgress,
	review: RawReview,
	history: RawReview[],
	clock: LearningClock,
	random = Math.random
): CardProgress {
	const card = structuredClone(input);
	if (card.state === "suspended") throw new Error("Suspended cards cannot be scheduled");
	const grade = gradeAnswer(review, history);
	const newDay = card.scheduledDay !== clock.sequence;
	if (!newDay && card.state !== "learning" && card.state !== "relearning") return card;
	const now = review.ts;
	if (newDay) {
		const memory = {
			...createEmptyCard(new Date(now)),
			due: new Date(card.due),
			state: card.stability === 0 ? State.New : State.Review,
			stability: card.stability,
			difficulty: card.difficulty,
			reps: card.reps,
			lapses: card.lapses,
			scheduled_days: card.interval,
			...(card.lastReview === null ? {} : { last_review: new Date(card.lastReview) })
		};
		const result = scheduler.next(memory, new Date(now), grade).card;
		const sample = random();
		if (!Number.isFinite(sample) || sample < 0 || sample >= 1)
			throw new Error("Invalid random sample");
		card.stability = result.stability;
		card.difficulty = result.difficulty;
		card.interval = Math.max(1, result.scheduled_days) * (0.95 + sample * 0.1);
		if (
			card.state === "relearning" ||
			((card.state === "review" || card.state === "mature") && grade === 1)
		)
			card.interval *= 0.5;
		card.pendingDue = Math.max(clock.nextBoundary, now + card.interval * DAY);
		card.scheduledDay = clock.sequence;
		card.lastReview = now;
	}
	card.reps++;
	if (review.correct && !review.timedOut && !card.passedLevels.includes(review.level))
		card.passedLevels.push(review.level);
	if (card.state === "new") {
		card.state = "learning";
		card.step = 1;
		card.due = now + 60_000;
	} else if (card.state === "learning") {
		if (grade === 1) {
			card.step = 1;
			card.due = now + 60_000;
		} else if (card.step < 2) {
			card.step = 2;
			card.due = now + 600_000;
		} else {
			card.state = "review";
			card.step = 0;
			card.due = Math.max(now + 1, card.pendingDue ?? now + card.interval * DAY);
			card.pendingDue = null;
		}
	} else if (card.state === "relearning") {
		if (grade === 1) card.due = now + 600_000;
		else {
			card.state = "review";
			card.due = Math.max(now + 1, card.pendingDue ?? now + card.interval * DAY);
			card.pendingDue = null;
		}
	} else if (grade === 1) {
		card.lapses++;
		card.state = "relearning";
		card.due = now + 600_000;
	} else {
		card.state = "review";
		card.due = card.pendingDue ?? now + card.interval * DAY;
		card.pendingDue = null;
	}
	if (
		card.state === "review" &&
		card.interval >= MATURE_INTERVAL_DAYS &&
		card.passedLevels.includes(3)
	)
		card.state = "mature";
	if (card.lapses >= 8) {
		card.state = "suspended";
		card.suspensionReason = "leech";
	}
	return card;
}
