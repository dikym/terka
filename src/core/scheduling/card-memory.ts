export type CardState =
	"locked" | "new" | "learning" | "review" | "relearning" | "mature" | "suspended";
export type SuspensionReason = "manual" | "leech" | "confidence" | "missing-data";

export type CardMemory = {
	cardId: string;
	state: CardState;
	stability: number;
	difficulty: number;
	intervalDays: number;
	due: number;
	pendingDue: number | null;
	reps: number;
	lapses: number;
	step: 0 | 1 | 2;
	lastReviewAt: number | null;
	scheduledDay: string | null;
	passedLevel3: boolean;
	suspension: null | { reason: SuspensionReason; resume: CardState };
};

export function newCard(cardId: string, locked = false): CardMemory {
	return {
		cardId,
		state: locked ? "locked" : "new",
		stability: 0,
		difficulty: 0,
		intervalDays: 0,
		due: 0,
		pendingDue: null,
		reps: 0,
		lapses: 0,
		step: 0,
		lastReviewAt: null,
		scheduledDay: null,
		passedLevel3: false,
		suspension: null
	};
}
