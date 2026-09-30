import type {
	CardEvent,
	FactView,
	FsrsParams,
	LearningEvent,
	PracticeRun,
	ReviewLog,
	ReviewVoid,
	RunKind,
	Sighting
} from "../../../src/core/log/events";
import type { CardMode } from "../../../src/core/questions/question";
import { localDay } from "../../../src/core/time/day";
import { ENGINE_VERSION } from "../../../src/rules";
import type { Bundle } from "../../../src/core/content/schema";
import { replay } from "../../../src/core/replay/replay";
import {
	initialState,
	newEntry,
	type AppState,
	type CardEntry
} from "../../../src/core/replay/state";
import { NOW, WITA, ruleBundle } from "../rules/fixtures";

export { NOW, WITA, ruleBundle } from "../rules/fixtures";
export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;

let counter = 0;
export const nextId = () => `id-${String(++counter).padStart(6, "0")}`;
const synced = { receivedAt: null, serverSeq: null };

export function review(
	contentId: string,
	mode: CardMode,
	at: number,
	overrides: Partial<ReviewLog> = {}
): LearningEvent {
	return {
		table: "review_logs",
		row: {
			id: nextId(),
			deviceId: "device-a",
			...synced,
			runId: null,
			contentId,
			mode,
			context: "daily",
			level: 2,
			levelSource: "auto",
			correct: true,
			timedOut: false,
			msToFirstKey: 2000,
			msTotal: 3000,
			msTyping: 500,
			keyGapsMs: [100],
			deletedChars: 0,
			optionChanges: 0,
			optionCount: null,
			inputMode: "keyboard",
			interrupted: false,
			rawAnswer: "medan",
			matchType: "exact",
			typoCost: 0,
			acceptedAreaId: null,
			promptAreaId: null,
			answerRulesVersion: 1,
			unknown: false,
			confusedWith: null,
			drillPairWith: null,
			setCorrect: null,
			setThreshold: null,
			setItems: null,
			questionType: "typed",
			contentVersion: 1,
			engineVersion: ENGINE_VERSION,
			clientTs: at,
			localDay: localDay(at, WITA),
			tz: WITA,
			...overrides
		}
	};
}

export const intro = (contentId: string, at: number, overrides: Partial<ReviewLog> = {}) =>
	review(contentId, "code2region", at, {
		context: "intro",
		level: 1,
		questionType: "choice",
		...overrides
	});

export function run(
	kind: RunKind,
	at: number,
	overrides: Partial<PracticeRun> = {}
): LearningEvent {
	return {
		table: "practice_runs",
		row: {
			id: nextId(),
			deviceId: "device-a",
			...synced,
			kind,
			scopeLevel: "national",
			scopeId: null,
			startedAt: at,
			localDay: localDay(at, WITA),
			endedAt: at + MINUTE,
			answered: 5,
			correct: 5,
			activeMs: MINUTE,
			score: kind === "kilat" ? 10 : null,
			estimatedMs: null,
			plannedCount: null,
			placementLevel: kind === "placement" ? "menengah" : null,
			...overrides
		}
	};
}

export function cardEvent(
	contentId: string,
	mode: CardMode,
	kind: CardEvent["kind"],
	at: number,
	overrides: Partial<CardEvent> = {}
): LearningEvent {
	return {
		table: "card_events",
		row: {
			id: nextId(),
			deviceId: "device-a",
			...synced,
			contentId,
			mode,
			kind,
			clientTs: at,
			localDay: localDay(at, WITA),
			...overrides
		}
	};
}

export const voidOf = (
	event: LearningEvent,
	at: number,
	overrides: Partial<ReviewVoid> = {}
): LearningEvent => ({
	table: "review_voids",
	row: {
		id: nextId(),
		deviceId: event.row.deviceId,
		...synced,
		reviewId: event.row.id,
		clientTs: at,
		...overrides
	}
});

export const sighting = (
	regionId: string,
	at: number,
	overrides: Partial<Sighting> = {}
): LearningEvent => ({
	table: "sightings",
	row: {
		id: nextId(),
		deviceId: "device-a",
		...synced,
		regionId,
		clientTs: at,
		localDay: localDay(at, WITA),
		...overrides
	}
});

export const factView = (
	factId: string,
	at: number,
	overrides: Partial<FactView> = {}
): LearningEvent => ({
	table: "fact_views",
	row: {
		id: nextId(),
		deviceId: "device-a",
		...synced,
		factId,
		runId: null,
		clientTs: at,
		localDay: localDay(at, WITA),
		...overrides
	}
});

export function params(
	at: number,
	weights: number[],
	overrides: Partial<FsrsParams> = {}
): LearningEvent {
	return {
		table: "fsrs_params",
		row: {
			id: nextId(),
			deviceId: "device-a",
			...synced,
			algorithm: "fsrs-6",
			libraryVersion: "test",
			weights,
			status: "active",
			activatedAt: at,
			trainedReviewCount: 1000,
			trainedThroughSeq: null,
			trainingSetHash: "00",
			createdAt: at,
			logloss: 0.3,
			rmse: 0.05,
			baselineLogloss: 0.31,
			baselineRmse: 0.05,
			...overrides
		}
	};
}

export const fresh = (bundle: Bundle = ruleBundle()): AppState =>
	initialState(bundle, new Set(), null);

export function seedCard(
	state: AppState,
	cardId: string,
	overrides: Partial<CardEntry>
): CardEntry {
	const card = { ...(state.cards.get(cardId) ?? newEntry(cardId)), ...overrides };
	state.cards.set(cardId, card);
	return card;
}

// A settled card last seen 30 days ago and due at NOW.
export const reviewCard = (overrides: Partial<CardEntry> = {}): Partial<CardEntry> => ({
	state: "review",
	stability: 30,
	difficulty: 5,
	intervalDays: 30,
	reps: 5,
	lastReviewAt: NOW - 30 * DAY,
	due: NOW,
	scheduledDay: "2026-08-22",
	...overrides
});

export function manyRegions(count: number): Bundle {
	const bundle = ruleBundle();
	for (let index = 0; index < count; index++)
		bundle.regions.push({
			...bundle.regions[0],
			id: `x${index}`,
			areas: [{ areaId: "kota-medan", confidence: "high" }]
		});
	return bundle;
}

export function stateOf(events: LearningEvent[], bundle: Bundle = ruleBundle()): AppState {
	const result = replay(events, bundle);
	if (result.status !== "ok") throw new Error("replay is outdated");
	return result.state;
}

const entries = <V>(map: ReadonlyMap<string, V>) =>
	[...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

// Plain, order-independent view of the state for equality checks and snapshots.
export const snapshot = (state: AppState) => ({
	cards: entries(state.cards),
	pairs: entries(state.pairs),
	narrow: entries(state.narrow),
	wide: entries(state.wide),
	durations: entries(state.durations),
	quota: entries(state.quota),
	introDay: entries(state.introDay),
	groupDay: entries(state.groupDay),
	dueByDay: entries(state.dueByDay).filter(([, count]) => count !== 0),
	openDue: [...state.openDue].sort(),
	tier: {
		current: state.tier.current,
		changedOn: state.tier.changedOn,
		days: entries(state.tier.days)
	},
	challengeDays: [...state.challengeDays].sort(),
	kilatRecords: entries(state.kilatRecords),
	factViews: state.factViews,
	sightings: entries(state.sightings),
	params: state.params.map((row) => row.id),
	voided: [...state.voided].sort(),
	placementRunId: state.placementRunId,
	firstCountedDay: state.firstCountedDay,
	currentDay: state.currentDay,
	lastTz: state.lastTz,
	lastKey: state.lastKey,
	diagnostics: state.diagnostics
});
