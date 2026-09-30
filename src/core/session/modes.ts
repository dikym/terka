import { CHALLENGE_SIZE, TIERS } from "../../rules";
import type { Bundle } from "../content/schema";
import { inScope, type Scope } from "../questions/distractors";
import { seeded, shuffle } from "../random";
import { priorityLoad, quotaLeft } from "../replay/days";
import { schedulerAt } from "../replay/params";
import type { AppState, CardEntry } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { retrievability } from "../scheduling/fsrs";
import {
	ACTIVE,
	cardsWhere,
	compareText,
	contentOf,
	isGroupA,
	prepare,
	SETTLED,
	STEPS,
	tierOn,
	todayOf,
	type QueueItem,
	type SessionContext
} from "./context";
import { pickFormat } from "./forms";

function learnedIn(state: AppState, bundle: Bundle, scope: Scope): CardEntry[] {
	const regions = new Map(bundle.regions.map((region) => [region.id, region]));
	return cardsWhere(state, isGroupA).filter((card) => {
		const region = regions.get(contentOf(card.cardId));
		return ACTIVE.has(card.state) && region !== undefined && inScope(region, scope);
	});
}

export function focusedQueue(
	input: AppState,
	bundle: Bundle,
	scope: Scope,
	ctx: SessionContext
): QueueItem[] {
	const state = prepare(input, ctx);
	const scheduler = schedulerAt(state.params, ctx.now);
	return learnedIn(state, bundle, scope)
		.map((card) => ({ card, r: retrievability(scheduler, card, ctx.now) }))
		.sort((a, b) => a.r - b.r || compareText(a.card.cardId, b.card.cardId))
		.map(({ card }) => ({
			cardId: card.cardId,
			context: "focused",
			slot: SETTLED.has(card.state) ? "review" : "step",
			format: pickFormat(card.cardId, `${card.cardId}:${card.reps}`, "focused")
		}));
}

export function challengeQueue(
	input: AppState,
	ctx: SessionContext
): QueueItem[] | { unavailable: "done" | "empty" } {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	if (state.challengeDays.has(today)) return { unavailable: "done" };
	const learned = cardsWhere(state, isGroupA).filter((card) => ACTIVE.has(card.state));
	if (!learned.length) return { unavailable: "empty" };
	return shuffle(learned, seeded(`challenge:${today}`))
		.slice(0, CHALLENGE_SIZE)
		.map((card) => ({
			cardId: card.cardId,
			context: "challenge",
			slot: "review",
			format: pickFormat(card.cardId, `challenge:${today}:${card.cardId}`, "challenge")
		}));
}

export function kilatQuestion(
	state: AppState,
	bundle: Bundle,
	scope: Scope,
	runId: string,
	index: number
): QueueItem | null {
	const pool = learnedIn(state, bundle, scope);
	if (!pool.length) return null;
	const card = pool[Math.floor(seeded(`${runId}:${index}`)() * pool.length)];
	return {
		cardId: card.cardId,
		context: "kilat",
		slot: "review",
		format: pickFormat(card.cardId, `${runId}:${index}`, "kilat")
	};
}

export function setrecallQueue(
	input: AppState,
	codeId: string,
	ctx: SessionContext
): QueueItem[] | { unavailable: "locked" | "suspended" | "quota" | "held" | "related" } {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const cardId = `${codeId}::setrecall`;
	const card = effectiveCard(state, cardId);
	if (!card || card.state === "locked") return { unavailable: "locked" };
	if (card.state === "suspended") return { unavailable: "suspended" };
	if (card.state !== "new")
		return [{ cardId, context: "setrecall", slot: STEPS.has(card.state) ? "step" : "review" }];
	if (state.introDay.get(codeId) === today) return { unavailable: "related" };
	if (priorityLoad(state, today, ctx.tz) > TIERS[tierOn(state, today)].hold)
		return { unavailable: "held" };
	if (quotaLeft(state, "region", today) <= 0) return { unavailable: "quota" };
	return [{ cardId, context: "intro", slot: "new", format: "choice" }];
}

export const setrecallDue = (state: AppState, ctx: SessionContext): string[] =>
	cardsWhere(state, (cardId) => cardId.endsWith("::setrecall"))
		.filter((card) => ACTIVE.has(card.state) && card.due <= ctx.now)
		.map((card) => contentOf(card.cardId));
