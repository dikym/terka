import { DEFAULT_TIER, type Tier } from "@/rules";
import type { Bundle } from "../content/schema";
import type { AnswerSignals } from "../grading/signals";
import type { CountedAnswer } from "../optimizer/counted";
import type { FsrsParams, PracticeRun } from "../log/events";
import type { EventKey } from "../log/order";
import { type CardMemory, newCard } from "../scheduling/card-memory";
import { localDay } from "../time/day";
import { contentIndex, universe } from "./universe";

export type ContentStatus = "ok" | "confidence" | "missing-data";
export type CardEntry = CardMemory & {
	passedLevels: [boolean, boolean, boolean];
	relatedSkips: number;
	answered: number;
	wrong: number;
	dueDay: string | null;
};
export type PairState = {
	occurrences: string[];
	flagged: boolean;
	cleared: boolean;
	drillStreak: number;
	drillDay: string | null;
};
export type DayStats = {
	tier: Tier;
	reviews: number;
	reviewsCorrect: number;
	held: boolean;
	// Scheduled Golongan A reviews answered that day, counted against the daily cap.
	capped: number;
};
export type Diagnostic = { eventId: string; reason: string };

export type AppState = {
	content: Map<string, ContentStatus>;
	cards: Map<string, CardEntry>;
	pairs: Map<string, PairState>;
	narrow: Map<string, AnswerSignals[]>;
	wide: Map<string, AnswerSignals[]>;
	durations: Map<string, number[]>;
	quota: Map<string, number>;
	introDay: Map<string, string>;
	groupDay: Map<string, string>;
	dueByDay: Map<string, number>;
	openDue: string[];
	tier: { current: Tier; changedOn: string | null; days: Map<string, DayStats> };
	challengeDays: Set<string>;
	// Closed daily and recheck runs, and the cards answered per run, kept apart because a run and
	// its answers can replay in either order. Both are dropped once their day has passed.
	dailyRuns: Map<string, { localDay: string; plannedCount: number }>;
	runCards: Map<string, { localDay: string; cards: Set<string> }>;
	doneDays: Set<string>;
	// First answer per code in the latest Cek Ingatan run (keyed by run, else by day); orders the
	// backlog that follows it.
	recheck: { key: string; day: string; results: Map<string, boolean> } | null;
	activeDays: Set<string>;
	kilatRecords: Map<string, number>;
	factViews: { factId: string; localDay: string; runId: string | null }[];
	sightings: Map<string, string[]>;
	params: FsrsParams[];
	voided: Set<string>;
	placementRunId: string | null;
	firstCountedDay: string | null;
	currentDay: string | null;
	lastTz: string | null;
	lastKey: EventKey | null;
	diagnostics: Diagnostic[];
	// Only filled when a caller asks replay to collect it; the cached state never carries it.
	counted?: CountedAnswer[];
};

export const newEntry = (cardId: string, locked = false): CardEntry => ({
	...newCard(cardId, locked),
	passedLevels: [false, false, false],
	relatedSkips: 0,
	answered: 0,
	wrong: 0,
	dueDay: null
});

export function initialState(
	bundle: Bundle,
	voided: Set<string>,
	placement: PracticeRun | null
): AppState {
	return {
		content: contentIndex(bundle),
		cards: new Map(
			universe(bundle).map(({ cardId, locked }) => [cardId, newEntry(cardId, locked)])
		),
		pairs: new Map(),
		narrow: new Map(),
		wide: new Map(),
		durations: new Map(),
		quota: new Map(),
		introDay: new Map(),
		groupDay: new Map(),
		dueByDay: new Map(),
		openDue: [],
		tier: {
			current: placement?.placementLevel ?? DEFAULT_TIER,
			changedOn: null,
			days: new Map()
		},
		challengeDays: new Set(),
		dailyRuns: new Map(),
		runCards: new Map(),
		doneDays: new Set(),
		recheck: null,
		activeDays: new Set(),
		kilatRecords: new Map(),
		factViews: [],
		sightings: new Map(),
		params: [],
		voided,
		placementRunId: placement?.id ?? null,
		firstCountedDay: null,
		currentDay: null,
		lastTz: null,
		lastKey: null,
		diagnostics: []
	};
}

const SETTLED = new Set<string>(["review", "mature"]);

// Stores the card and keeps the per-day review load that fuzz spreads new due dates over.
export function putCard(
	state: AppState,
	card: CardEntry,
	memory: CardMemory,
	tz: string
): CardEntry {
	const next: CardEntry = { ...card, ...memory };
	if (card.dueDay !== null)
		state.dueByDay.set(card.dueDay, (state.dueByDay.get(card.dueDay) ?? 1) - 1);
	next.dueDay = SETTLED.has(next.state) ? localDay(next.due, tz) : null;
	if (next.dueDay !== null)
		state.dueByDay.set(next.dueDay, (state.dueByDay.get(next.dueDay) ?? 0) + 1);
	state.cards.set(next.cardId, next);
	return next;
}
