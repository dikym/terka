import {
	FLUENCY_MIN_SAMPLES,
	KEYBOARD_HINT_SESSIONS,
	KILAT_ROUND_MS,
	NOMINAL_MS,
	PLACEMENT_STAGE_SIZES,
	PREVIEW_MAX_INFO,
	PREVIEW_STALE_MS,
	READ_MS
} from "@/rules";
import type { Bundle } from "../content/schema";
import { buildQuestion } from "../questions/build";
import { inScope, type Scope } from "../questions/distractors";
import type { Level, Question } from "../questions/question";
import type { AppState } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { rungMemory } from "./rung";
import {
	contentOf,
	prepare,
	type QueueItem,
	type SessionContext,
	type SessionSettings,
	todayOf
} from "./context";

export type InfoItem = "held" | "tier-changed" | "timed" | "leech" | "outside-scope" | "keyboard";
export type Preview = {
	questions: Question[];
	/** Introductions the session will ask once more; part of the count and the estimate. */
	reasks: number;
	counts: Record<QueueItem["slot"], number>;
	byType: Partial<Record<Question["questionType"], number>>;
	byLevel: Record<Level, number>;
	estimatedMs: number;
	range: { kind: "under-minute" } | { kind: "minutes"; min: number; max: number };
	info: InfoItem[];
	builtAt: number;
	localDay: string;
	revision: string;
};
export type PreviewExtras = {
	held: boolean;
	lastInputMode: "keyboard" | "touch" | null;
	completedSessions: number;
	revision: string;
};

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function questionMs(
	state: AppState,
	question: Question,
	item: QueueItem,
	inputMode: "keyboard" | "touch"
): number {
	const intro = question.context === "intro";
	const samples =
		state.durations.get(`${question.questionType}|${question.level}|${inputMode}`) ?? [];
	if (samples.length >= FLUENCY_MIN_SAMPLES)
		return Math.round(median(samples)) + (intro ? READ_MS.intro : READ_MS.other);
	if (intro) return NOMINAL_MS.intro;
	if (question.questionType === "setrecall") return NOMINAL_MS.set;
	if (item.slot === "drill") return NOMINAL_MS.drill;
	if (item.slot === "step") return NOMINAL_MS.step;
	// Picking is as quick at Level 2 as at Level 1; only typing takes longer.
	return NOMINAL_MS.level[question.answerForm === "choice" ? 1 : question.level];
}

export const durationRange = (ms: number): Preview["range"] =>
	ms < 60_000
		? { kind: "under-minute" }
		: {
				kind: "minutes",
				min: Math.round((0.8 * ms) / 60_000),
				max: Math.round((1.2 * ms) / 60_000)
			};

export function buildPreview(
	input: AppState,
	bundle: Bundle,
	items: QueueItem[],
	settings: SessionSettings,
	ctx: SessionContext,
	extras: PreviewExtras
): Preview {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const inputMode = extras.lastInputMode ?? "keyboard";
	const regions = new Map(bundle.regions.map((region) => [region.id, region]));
	const questions = items.map((item) => {
		const entry = effectiveCard(state, item.cardId)!;
		return buildQuestion(entry, bundle, {
			context: item.context,
			format: item.format,
			drillPair: item.drillPair,
			scope: settings.scope,
			memory: rungMemory(state, entry, ctx.now)
		});
	});
	const counts: Preview["counts"] = { step: 0, drill: 0, review: 0, new: 0 };
	const byType: Preview["byType"] = {};
	const byLevel: Preview["byLevel"] = { 1: 0, 2: 0, 3: 0 };
	let estimatedMs = 0;
	questions.forEach((question, index) => {
		counts[items[index].slot]++;
		byType[question.questionType] = (byType[question.questionType] ?? 0) + 1;
		byLevel[question.level]++;
		estimatedMs += questionMs(state, question, items[index], inputMode);
	});
	const reasks = questions.filter((question) => question.context === "intro").length;
	estimatedMs += reasks * NOMINAL_MS.step;
	const outside = items.some((item) => {
		const region = regions.get(contentOf(item.cardId));
		return item.slot === "review" && region !== undefined && !inScope(region, settings.scope);
	});
	const candidates: [InfoItem, boolean][] = [
		["held", extras.held],
		["tier-changed", state.tier.changedOn === today],
		[
			"timed",
			questions.some(
				(question) => question.level === 3 && question.limit?.until === "first-input"
			)
		],
		["leech", questions.some((question) => question.assisted)],
		["outside-scope", outside],
		[
			"keyboard",
			extras.lastInputMode === "keyboard" && extras.completedSessions < KEYBOARD_HINT_SESSIONS
		]
	];
	return {
		questions,
		reasks,
		counts,
		byType,
		byLevel,
		estimatedMs,
		range: durationRange(estimatedMs),
		info: candidates
			.filter(([, on]) => on)
			.map(([name]) => name)
			.slice(0, PREVIEW_MAX_INFO),
		builtAt: ctx.now,
		localDay: today,
		revision: extras.revision
	};
}

export const previewStale = (preview: Preview, ctx: SessionContext, revision: string) =>
	ctx.now - preview.builtAt > PREVIEW_STALE_MS ||
	todayOf(ctx) !== preview.localDay ||
	revision !== preview.revision;

export const recordKey = (scope: Scope) =>
	`${scope.level}|${scope.level === "national" ? "" : scope.id}`;

export const kilatPreview = (state: AppState, scope: Scope) => ({
	durationMs: KILAT_ROUND_MS,
	record: state.kilatRecords.get(recordKey(scope)) ?? null
});

export const PLACEMENT_PREVIEW = {
	maxQuestions:
		PLACEMENT_STAGE_SIZES.common + PLACEMENT_STAGE_SIZES.medium + PLACEMENT_STAGE_SIZES.rare,
	approxMinutes: 3
};
