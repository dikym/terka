import { createEmptyCard, fsrs, State } from "ts-fsrs";
import { gradeAnswer } from "./grading";
import { boundary, addDays } from "./time";
import { DAY, type CardProgress, type LearningClock, type RawReview } from "./model";
import { FUZZ_MIN_DAYS, FUZZ_RATIO, MATURE_INTERVAL_DAYS } from "../../rules";

// Minute steps belong to Terka; FSRS only supplies the daily memory update.
const scheduler = fsrs({ request_retention: 0.9, enable_fuzz: false, enable_short_term: false });

// SRD 4.7: the first sighting is an ungraded guess; the first FSRS grade comes from the 1-minute step.
export function introduceCard(card: CardProgress, now: number): CardProgress {
	return { ...card, state: "learning", step: 1, due: now + 60_000 };
}

function toMemory(card: CardProgress) {
	return {
		...createEmptyCard(new Date(card.due)),
		due: new Date(card.due),
		state: card.stability === 0 ? State.New : State.Review,
		stability: card.stability,
		difficulty: card.difficulty,
		reps: card.reps,
		lapses: card.lapses,
		scheduled_days: card.interval,
		...(card.lastReview === null ? {} : { last_review: new Date(card.lastReview) })
	};
}

// SRD 4.7: reviews are served from the lowest predicted recall.
export function retrievability(card: CardProgress, now: number): number {
	if (card.lastReview === null || card.stability === 0) return 0;
	return scheduler.get_retrievability(toMemory(card), new Date(now), false);
}

// FNV-1a seed + mulberry32: the same answer id picks the same day on every device.
function seededRandom(seed: string): () => number {
	let hash = 0x811c9dc5;
	for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
	let state = hash >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

// SRD 4.6: within ±5% pick the least loaded learning day; ties are broken by the answer id.
export function scheduledDays(
	interval: number,
	card: CardProgress,
	cards: CardProgress[],
	clock: LearningClock,
	seed: string
): number {
	const days = Math.max(1, Math.round(interval));
	if (days < FUZZ_MIN_DAYS) return days;
	const load = (offset: number) => {
		const start = boundary(addDays(clock.day, offset), clock.timezone);
		const end = boundary(addDays(clock.day, offset + 1), clock.timezone);
		return cards.filter(
			(other) =>
				other.cardId !== card.cardId &&
				other.state !== "new" &&
				other.state !== "suspended" &&
				other.due >= start &&
				other.due < end
		).length;
	};
	const candidates: { days: number; load: number }[] = [];
	for (
		let offset = Math.round(days * (1 - FUZZ_RATIO));
		offset <= Math.round(days * (1 + FUZZ_RATIO));
		offset++
	)
		candidates.push({ days: offset, load: load(offset) });
	const least = Math.min(...candidates.map((candidate) => candidate.load));
	const best = candidates.filter((candidate) => candidate.load === least);
	return best[Math.floor(seededRandom(seed)() * best.length)].days;
}

export function scheduleAnswer(
	input: CardProgress,
	review: RawReview,
	history: RawReview[],
	clock: LearningClock,
	cards: CardProgress[] = []
): CardProgress {
	const card = structuredClone(input);
	if (card.state === "suspended") throw new Error("Suspended cards cannot be scheduled");
	const grade = gradeAnswer(review, history);
	const newDay = card.scheduledDay !== clock.sequence;
	if (!newDay && card.state !== "learning" && card.state !== "relearning") return card;
	const now = review.ts;
	if (newDay) {
		const memory = toMemory(card);
		const result = scheduler.next(memory, new Date(now), grade).card;
		card.stability = result.stability;
		card.difficulty = result.difficulty;
		card.interval = scheduledDays(result.scheduled_days, input, cards, clock, review.id);
		card.pendingDue = boundary(addDays(clock.day, card.interval), clock.timezone);
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
		card.resumeState = null;
	}
	return card;
}
