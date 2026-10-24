import {
	ANSWER_RULES_VERSION,
	ENGINE_VERSION,
	KEY_GAP_CAP_MS,
	KEY_GAPS_MAX,
	SIGHTING_DEDUPE_MS,
	type Tier
} from "@/rules";
import type { Bundle } from "../content/schema";
import type { CardEvent, LearningEvent, PracticeRun, ReviewLog, RunKind } from "../log/events";
import type { Scope } from "../questions/distractors";
import { parseCardId, type Question } from "../questions/question";
import { frontCode, SPECIAL_SERIES } from "../reference/front-code";
import { nextLocalDay } from "../time/day";
import type { Checked, Response } from "./check";
import type { SessionContext } from "./context";
import { uuidV7 } from "./ids";

export type Measurements = {
	msToFirstKey: number | null;
	msTotal: number;
	msTyping: number | null;
	keyGapsMs: number[] | null;
	deletedChars: number;
	optionChanges: number;
	optionCount: number | null;
	inputMode: "keyboard" | "touch";
	interrupted: boolean;
	timedOut: boolean;
};
export type LastDay = { localDay: string; tz: string };

const unsynced = { receivedAt: null, serverSeq: null };
const base = (ctx: SessionContext) => ({
	id: uuidV7(ctx.now, ctx.random),
	deviceId: ctx.deviceId,
	...unsynced
});
const dayOf = (ctx: SessionContext, lastDay?: LastDay) => nextLocalDay(ctx.now, ctx.tz, lastDay);

export function startRun(
	kind: RunKind,
	scope: Scope,
	ctx: SessionContext,
	plan: { estimatedMs: number | null; plannedCount: number | null },
	lastDay?: LastDay
): LearningEvent {
	return {
		table: "practice_runs",
		row: {
			...base(ctx),
			kind,
			scopeLevel: scope.level,
			scopeId: scope.level === "national" ? null : scope.id,
			startedAt: ctx.now,
			localDay: dayOf(ctx, lastDay),
			endedAt: null,
			answered: null,
			correct: null,
			activeMs: null,
			score: null,
			estimatedMs: plan.estimatedMs,
			plannedCount: plan.plannedCount,
			placementLevel: null
		}
	};
}

export function closeRun(
	run: PracticeRun,
	ctx: SessionContext,
	result: {
		answered: number;
		correct: number;
		activeMs: number;
		score?: number | null;
		placementLevel?: Tier | null;
	}
): LearningEvent {
	const score = result.score ?? null;
	const placementLevel = result.placementLevel ?? null;
	if (run.endedAt !== null) throw new Error("a session is closed only once");
	if ((run.kind === "kilat") !== (score !== null))
		throw new Error("score belongs to Kilat sessions only");
	if ((run.kind === "placement") !== (placementLevel !== null))
		throw new Error("placement level belongs to placement sessions only");
	if (result.correct < 0 || result.correct > result.answered || result.activeMs < 0)
		throw new Error("closing counts are out of range");
	return {
		table: "practice_runs",
		row: {
			...run,
			endedAt: Math.max(ctx.now, run.startedAt),
			answered: result.answered,
			correct: result.correct,
			activeMs: result.activeMs,
			score,
			placementLevel
		}
	};
}

export function answerEvent(
	question: Question,
	response: Response,
	checked: Checked,
	measurements: Measurements,
	ctx: SessionContext,
	extras: { runId: string | null; contentVersion: number; lastDay?: LastDay }
): LearningEvent {
	const { contentId, mode } = parseCardId(question.cardId);
	const row: ReviewLog = {
		...base(ctx),
		runId: extras.runId,
		contentId,
		mode,
		context: question.context,
		level: question.level,
		levelSource: question.levelSource,
		correct: checked.correct,
		timedOut: measurements.timedOut,
		msToFirstKey: measurements.msToFirstKey,
		msTotal: measurements.msTotal,
		msTyping: measurements.msTyping,
		keyGapsMs:
			measurements.keyGapsMs
				?.slice(0, KEY_GAPS_MAX)
				.map((gap) => Math.min(gap, KEY_GAP_CAP_MS)) ?? null,
		deletedChars: measurements.deletedChars,
		optionChanges: measurements.optionChanges,
		optionCount: measurements.optionCount,
		inputMode: measurements.inputMode,
		interrupted: measurements.interrupted,
		rawAnswer: checked.rawAnswer,
		matchType: checked.matchType,
		typoCost: checked.typoCost,
		acceptedAreaId: checked.acceptedAreaId,
		promptAreaId: question.promptAreaId,
		answerRulesVersion: ANSWER_RULES_VERSION,
		unknown: question.context === "placement" && "unknown" in response,
		confusedWith: checked.confusedWith,
		drillPairWith: question.drillPairWith,
		setCorrect: checked.setCorrect,
		setThreshold: checked.setThreshold,
		setItems: checked.setItems,
		questionType: question.questionType,
		contentVersion: extras.contentVersion,
		engineVersion: ENGINE_VERSION,
		clientTs: ctx.now,
		localDay: dayOf(ctx, extras.lastDay),
		tz: ctx.tz
	};
	return { table: "review_logs", row };
}

// The caller passes only the latest answer of the open question screen.
export const canUndo = (
	answer: ReviewLog | null,
	ctx: Pick<SessionContext, "deviceId">,
	screen: { voided: boolean; open: boolean }
) =>
	answer !== null &&
	answer.deviceId === ctx.deviceId &&
	answer.context !== "kilat" &&
	!screen.voided &&
	screen.open;

export function voidEvent(answer: ReviewLog, ctx: SessionContext): LearningEvent {
	if (answer.deviceId !== ctx.deviceId)
		throw new Error("only answers from this device can be undone");
	return { table: "review_voids", row: { ...base(ctx), reviewId: answer.id, clientTs: ctx.now } };
}

export function cardEvent(
	cardId: string,
	kind: CardEvent["kind"],
	ctx: SessionContext,
	lastDay?: LastDay
): LearningEvent {
	const { contentId, mode } = parseCardId(cardId);
	return {
		table: "card_events",
		row: {
			...base(ctx),
			contentId,
			mode,
			kind,
			clientTs: ctx.now,
			localDay: dayOf(ctx, lastDay)
		}
	};
}

// Only the front code of a region is ever kept; the rest of a typed plate is dropped here.
export function sightingEvent(
	input: string,
	bundle: Bundle,
	ctx: SessionContext,
	lastSightingAt: number | null,
	lastDay?: LastDay
): LearningEvent | null {
	const code = frontCode(input);
	if (!code || SPECIAL_SERIES.has(code)) return null;
	const region = bundle.regions.find((item) => item.code === code);
	if (!region) return null;
	if (lastSightingAt !== null && ctx.now - lastSightingAt < SIGHTING_DEDUPE_MS) return null;
	return {
		table: "sightings",
		row: { ...base(ctx), regionId: region.id, clientTs: ctx.now, localDay: dayOf(ctx, lastDay) }
	};
}
