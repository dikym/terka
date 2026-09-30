import type { CardEvent, LearningEvent, PracticeRun } from "../log/events";
import { compareKeys, eventKey } from "../log/order";
import { suspend, unsuspend } from "../scheduling/card";
import { isTimeZone } from "../time/day";
import { advanceDays } from "./days";
import { addParams } from "./params";
import { applyReview } from "./review";
import { putCard, type AppState } from "./state";

const CONTENT_ID = /^[a-z0-9-]{1,32}$/;

const eventDay = (event: LearningEvent): string | null =>
	event.table === "review_voids" || event.table === "fsrs_params" ? null : event.row.localDay;

function applyCardEvent(state: AppState, row: CardEvent) {
	const card = state.cards.get(`${row.contentId}::${row.mode}`);
	if (!card) return;
	const tz = state.lastTz ?? "UTC";
	if (row.kind === "suspend" && card.state !== "suspended" && card.state !== "locked")
		putCard(state, card, suspend(card, "manual"), tz);
	if (row.kind === "unsuspend" && card.suspension) putCard(state, card, unsuspend(card), tz);
}

function applyRun(state: AppState, run: PracticeRun) {
	if (run.endedAt === null) return;
	if (run.kind === "challenge") state.challengeDays.add(run.localDay);
	if (run.kind === "kilat" && run.score !== null) {
		const key = `${run.scopeLevel}|${run.scopeId ?? ""}`;
		state.kilatRecords.set(key, Math.max(state.kilatRecords.get(key) ?? 0, run.score));
	}
}

const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Rows another client wrote with values this engine cannot read are skipped, never thrown on.
function invalidEvent(event: LearningEvent): string | null {
	const day = eventDay(event);
	if (day !== null && !LOCAL_DAY.test(day)) return "invalid local day";
	if (event.table !== "review_logs") return null;
	if (!isTimeZone(event.row.tz)) return "unknown time zone";
	if (!CONTENT_ID.test(event.row.contentId)) return "invalid content id";
	if (
		event.row.questionType === "setrecall" &&
		(event.row.setCorrect === null || event.row.setThreshold === null)
	)
		return "set answer without setCorrect or setThreshold";
	return null;
}

// The single reducer behind both the full replay and the append path.
export function applyEvent(state: AppState, event: LearningEvent): void {
	const key = eventKey(event);
	const problem = invalidEvent(event);
	if (problem) state.diagnostics.push({ eventId: event.row.id, reason: problem });
	else {
		if (event.table === "review_logs") state.lastTz = event.row.tz;
		const day = eventDay(event);
		if (day !== null) advanceDays(state, day);
		switch (event.table) {
			case "review_logs":
				applyReview(state, event.row, key.ts);
				break;
			case "card_events":
				applyCardEvent(state, event.row);
				break;
			case "sightings":
				state.sightings.set(event.row.regionId, [
					...(state.sightings.get(event.row.regionId) ?? []),
					event.row.localDay
				]);
				break;
			case "fact_views":
				state.factViews.push({
					factId: event.row.factId,
					localDay: event.row.localDay,
					runId: event.row.runId
				});
				break;
			case "fsrs_params":
				state.params = addParams(state.params, event.row);
				break;
			case "practice_runs":
				applyRun(state, event.row);
				break;
		}
	}
	if (state.lastKey === null || compareKeys(key, state.lastKey) > 0) state.lastKey = key;
}
