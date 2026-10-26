import { ENGINE_VERSION } from "@/rules";
import type { Bundle } from "../content/schema";
import type { LearningEvent, PracticeRun } from "../log/events";
import { compareKeys, eventKey, sortEvents } from "../log/order";
import { CARD_MODES, CONTEXTS, MATCH_TYPES, QUESTION_TYPES } from "../log/values";
import { applyEvent } from "./apply";
import { activation } from "./params";
import { type AppState, initialState } from "./state";

export type ReplayResult = { status: "ok"; state: AppState } | { status: "outdated" };

const known = (values: Record<string, true>, value: string) => Object.hasOwn(values, value);

// A newer client wrote these; replaying them with older rules would give a different state.
const isOutdated = (events: readonly LearningEvent[]) =>
	events.some(
		(event) =>
			(event.table === "review_logs" &&
				(event.row.engineVersion > ENGINE_VERSION ||
					!known(CARD_MODES, event.row.mode) ||
					!known(CONTEXTS, event.row.context) ||
					!known(QUESTION_TYPES, event.row.questionType) ||
					!known(MATCH_TYPES, event.row.matchType))) ||
			(event.table === "card_events" && !known(CARD_MODES, event.row.mode))
	);

const PRACTICE = new Set(["daily", "drill", "focused", "setrecall", "special", "recheck"]);

// A placement taken after real practice began cannot replace the level set before it.
function effectivePlacement(
	sorted: readonly LearningEvent[],
	voided: ReadonlySet<string>
): PracticeRun | null {
	let chosen: PracticeRun | null = null;
	for (const event of sorted) {
		if (
			event.table === "review_logs" &&
			PRACTICE.has(event.row.context) &&
			!voided.has(event.row.id)
		)
			break;
		if (
			event.table === "practice_runs" &&
			event.row.kind === "placement" &&
			event.row.endedAt !== null
		)
			chosen = event.row;
	}
	return chosen;
}

export function replay(
	events: readonly LearningEvent[],
	bundle: Bundle,
	options: { collect?: boolean } = {}
): ReplayResult {
	if (isOutdated(events)) return { status: "outdated" };
	const sorted = sortEvents(events);
	const voided = new Set(
		sorted.flatMap((event) => (event.table === "review_voids" ? [event.row.reviewId] : []))
	);
	const state = initialState(bundle, voided, effectivePlacement(sorted, voided));
	if (options.collect) state.counted = [];
	for (const event of sorted) applyEvent(state, event);
	return { status: "ok", state };
}

// Returns "full" whenever the batch reaches into the past; the caller then replays the whole log once.
export function append(state: AppState, batch: readonly LearningEvent[]): ReplayResult | "full" {
	if (isOutdated(batch)) return { status: "outdated" };
	const sorted = sortEvents(batch);
	const last = state.lastKey;
	const needsFull = sorted.some(
		(event) =>
			event.table === "review_voids" ||
			(event.table === "practice_runs" &&
				event.row.kind === "placement" &&
				event.row.endedAt !== null) ||
			(last !== null && compareKeys(eventKey(event), last) <= 0) ||
			(event.table === "fsrs_params" && last !== null && activation(event.row) <= last.ts)
	);
	if (needsFull) return "full";
	const next = structuredClone(state);
	for (const event of sorted) applyEvent(next, event);
	return { status: "ok", state: next };
}
