import { RELATED_SKIP_LIMIT, REVIEW_CAP_PER_DAY, SPECIAL_HOLD, TIERS } from "@/rules";
import type { Bundle, Region } from "../content/schema";
import { inScope } from "../questions/distractors";
import type { QuestionContext } from "../questions/question";
import { priorityLoad, quotaLeft } from "../replay/days";
import { schedulerAt } from "../replay/params";
import type { AppState, CardEntry } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { retrievability } from "../scheduling/fsrs";
import { sightingCounts } from "../views/stats";
import {
	ACTIVE,
	cardsWhere,
	compareText,
	contentOf,
	isGroupA,
	isSpecial,
	modeOf,
	prepare,
	type QueueItem,
	type SessionContext,
	type SessionSettings,
	SETTLED,
	STEPS,
	tierOn,
	todayOf,
	uniqueItems
} from "./context";
import { pickFormat } from "./forms";

export type DailyQueue = { items: QueueItem[]; held: boolean; outsideScopeNew: number };

const item = (card: CardEntry, context: QuestionContext, slot: QueueItem["slot"]): QueueItem => ({
	cardId: card.cardId,
	context,
	slot,
	format: pickFormat(card.cardId, `${card.cardId}:${card.reps}`, context)
});

export const dueSteps = (cards: CardEntry[], now: number, context: QuestionContext) =>
	cards
		.filter((card) => STEPS.has(card.state) && card.due <= now)
		.sort((a, b) => a.due - b.due || compareText(a.cardId, b.cardId))
		.map((card) => item(card, context, "step"));

type Ranked = { card: CardEntry; r: number };

// A card skipped twice for its group goes first on the third day, whatever its recall.
function outranks(a: Ranked, b: Ranked) {
	const skippedA = a.card.relatedSkips >= RELATED_SKIP_LIMIT;
	const skippedB = b.card.relatedSkips >= RELATED_SKIP_LIMIT;
	if (skippedA !== skippedB) return skippedA;
	return a.r < b.r || (a.r === b.r && a.card.cardId < b.card.cardId);
}

export function dueReviews(
	state: AppState,
	cards: CardEntry[],
	today: string,
	now: number,
	context: QuestionContext
): QueueItem[] {
	const scheduler = schedulerAt(state.params, now);
	const best = new Map<string, Ranked>();
	for (const card of cards) {
		if (!SETTLED.has(card.state) || card.due > now) continue;
		const group = contentOf(card.cardId);
		if (state.groupDay.get(group) === today) continue;
		const ranked = { card, r: retrievability(scheduler, card, now) };
		const current = best.get(group);
		if (!current || outranks(ranked, current)) best.set(group, ranked);
	}
	return [...best.values()]
		.sort((a, b) => a.r - b.r || compareText(a.card.cardId, b.card.cardId))
		.map(({ card }) => item(card, context, "review"));
}

export const reviewsLeft = (state: AppState, today: string) =>
	Math.max(0, REVIEW_CAP_PER_DAY - (state.tier.days.get(today)?.capped ?? 0));

// Every Golongan A review due now, before the daily cap trims it.
export function dueReviewCount(input: AppState, ctx: SessionContext): number {
	const state = prepare(input, ctx);
	return dueReviews(state, cardsWhere(state, isGroupA), todayOf(ctx), ctx.now, "daily").length;
}

function drills(state: AppState, today: string): QueueItem[] {
	const items: QueueItem[] = [];
	for (const [key, pair] of [...state.pairs].sort(([a], [b]) => compareText(a, b))) {
		if (!pair.flagged || pair.drillDay === today) continue;
		const [from, to] = key.split(">");
		const own = effectiveCard(state, `${from}::code2region`);
		const other = effectiveCard(state, `${to}::code2region`);
		if (!own || !other || own.state === "suspended" || other.state === "suspended") continue;
		if (!ACTIVE.has(own.state)) continue;
		items.push({ cardId: own.cardId, context: "drill", slot: "drill", drillPair: to });
	}
	return items;
}

function introductions(
	state: AppState,
	candidates: CardEntry[],
	quota: number,
	today: string
): QueueItem[] {
	const items: QueueItem[] = [];
	const groups = new Set<string>();
	for (const card of candidates) {
		if (items.length >= quota) break;
		const group = contentOf(card.cardId);
		if (groups.has(group) || state.introDay.get(group) === today) continue;
		groups.add(group);
		items.push({ cardId: card.cardId, context: "intro", slot: "new", format: "choice" });
	}
	return items;
}

export function dailyQueue(
	input: AppState,
	bundle: Bundle,
	settings: SessionSettings,
	ctx: SessionContext
): DailyQueue {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const cards = cardsWhere(state, isGroupA);
	const due = uniqueItems([
		...dueSteps(cards, ctx.now, "daily"),
		...drills(state, today),
		...dueReviews(state, cards, today, ctx.now, "daily").slice(0, reviewsLeft(state, today))
	]);
	const held = priorityLoad(state, today, ctx.tz) > TIERS[tierOn(state, today)].hold;
	const regions = new Map<string, { region: Region; order: number }>(
		bundle.regions.map((region, order) => [region.id, { region, order }])
	);
	const seen = sightingCounts(state, today);
	const waiting = cards.filter((card) => card.state === "new");
	const scoped = (card: CardEntry) => {
		const found = regions.get(contentOf(card.cardId));
		return found !== undefined && inScope(found.region, settings.scope);
	};
	const candidates = waiting
		.filter((card) => modeOf(card.cardId) === "region2code" || scoped(card))
		.sort((a, b) => {
			const codeA = contentOf(a.cardId);
			const codeB = contentOf(b.cardId);
			return (
				(seen.get(codeB) ?? 0) - (seen.get(codeA) ?? 0) ||
				(regions.get(codeA)?.order ?? Infinity) - (regions.get(codeB)?.order ?? Infinity) ||
				compareText(modeOf(a.cardId), modeOf(b.cardId))
			);
		});
	const quota = held ? 0 : quotaLeft(state, "region", today);
	return {
		items: uniqueItems([...due, ...introductions(state, candidates, quota, today)]),
		held,
		outsideScopeNew: waiting.filter(
			(card) => modeOf(card.cardId) === "code2region" && !scoped(card)
		).length
	};
}

export function specialQueue(
	input: AppState,
	bundle: Bundle,
	settings: SessionSettings,
	ctx: SessionContext
): DailyQueue {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const cards = cardsWhere(state, isSpecial);
	const due = uniqueItems([
		...dueSteps(cards, ctx.now, "special"),
		...dueReviews(state, cards, today, ctx.now, "special")
	]);
	const held = due.length > SPECIAL_HOLD;
	const numbers = new Map(bundle.specials.map((special) => [special.id, Number(special.number)]));
	const candidates = cards
		.filter((card) => card.state === "new")
		.sort(
			(a, b) =>
				(numbers.get(contentOf(a.cardId)) ?? Infinity) -
					(numbers.get(contentOf(b.cardId)) ?? Infinity) ||
				compareText(modeOf(b.cardId), modeOf(a.cardId))
		);
	const quota = held || !settings.specialEnabled ? 0 : quotaLeft(state, "special", today);
	return {
		items: uniqueItems([...due, ...introductions(state, candidates, quota, today)]),
		held,
		outsideScopeNew: 0
	};
}
