import {
	SPECIAL_NEW_PER_DAY,
	TIER_COOLDOWN_DAYS,
	TIER_DOWN_ACCURACY,
	TIER_DOWN_MIN_HELD,
	TIER_MIN_REVIEWS,
	TIER_ORDER,
	TIER_UP_ACCURACY,
	TIER_UP_MAX_HELD,
	TIER_WINDOW_DAYS,
	TIERS
} from "@/rules";
import { addDays, dayNumber, dayStart } from "../time/day";
import type { AppState, DayStats } from "./state";
import { effectiveCard } from "./universe";

const ACTIVE = new Set<string>(["learning", "relearning", "review", "mature"]);
const SETTLED = new Set<string>(["review", "mature"]);
const contentOf = (cardId: string) => cardId.slice(0, cardId.indexOf("::"));
const modeOf = (cardId: string) => cardId.slice(cardId.indexOf("::") + 2);

export function dayStats(state: AppState, day: string): DayStats {
	let stats = state.tier.days.get(day);
	if (!stats) {
		stats = { tier: state.tier.current, reviews: 0, reviewsCorrect: 0, held: false };
		state.tier.days.set(day, stats);
	}
	return stats;
}

// Overflow from devices that were offline together comes out of the next day only, capped at one limit.
export function quotaLeft(state: AppState, track: "region" | "special", day: string): number {
	const limit = (on: string) =>
		track === "special"
			? SPECIAL_NEW_PER_DAY
			: TIERS[state.tier.days.get(on)?.tier ?? state.tier.current].newPerDay;
	const used = (on: string) => state.quota.get(`${track}|${on}`) ?? 0;
	const yesterday = addDays(day, -1);
	const carry = Math.min(limit(yesterday), Math.max(0, used(yesterday) - limit(yesterday)));
	return Math.max(0, limit(day) - carry - used(day));
}

// Queue priorities 1–3 (steps, drills, reviews) of Golongan A due by the end of `day`.
export function priorityLoad(state: AppState, day: string, tz: string): number {
	const end = dayStart(addDays(day, 1), tz);
	let load = 0;
	for (const cardId of state.cards.keys()) {
		const mode = modeOf(cardId);
		if (mode !== "code2region" && mode !== "region2code") continue;
		const card = effectiveCard(state, cardId)!;
		if (ACTIVE.has(card.state) && card.due < end) load++;
	}
	for (const [key, pair] of state.pairs) {
		if (!pair.flagged) continue;
		const codes = key.split(">").map((id) => effectiveCard(state, `${id}::code2region`));
		if (codes.every((card) => card !== undefined && card.state !== "suspended")) load++;
	}
	return load;
}

function evaluateTier(state: AppState, day: string) {
	const tier = state.tier;
	if (
		!state.firstCountedDay ||
		dayNumber(day) - dayNumber(state.firstCountedDay) < TIER_WINDOW_DAYS
	)
		return;
	if (tier.changedOn && dayNumber(day) - dayNumber(tier.changedOn) < TIER_COOLDOWN_DAYS) return;
	let reviews = 0;
	let correct = 0;
	let held = 0;
	for (let offset = 1; offset <= TIER_WINDOW_DAYS; offset++) {
		const stats = tier.days.get(addDays(day, -offset));
		if (!stats) continue;
		reviews += stats.reviews;
		correct += stats.reviewsCorrect;
		if (stats.held) held++;
	}
	if (reviews < TIER_MIN_REVIEWS) return;
	const accuracy = correct / reviews;
	const index = TIER_ORDER.indexOf(tier.current);
	let next = index;
	if (accuracy >= TIER_UP_ACCURACY && held <= TIER_UP_MAX_HELD)
		next = Math.min(index + 1, TIER_ORDER.length - 1);
	else if (accuracy < TIER_DOWN_ACCURACY || held >= TIER_DOWN_MIN_HELD)
		next = Math.max(index - 1, 0);
	if (next === index) return;
	tier.current = TIER_ORDER[next];
	tier.changedOn = day;
}

function openDay(state: AppState, day: string) {
	const tz = state.lastTz ?? "UTC";
	evaluateTier(state, day);
	const stats = dayStats(state, day);
	stats.tier = state.tier.current;
	stats.held = priorityLoad(state, day, tz) > TIERS[state.tier.current].hold;
	const end = dayStart(addDays(day, 1), tz);
	state.openDue = [...state.cards.values()]
		.filter((card) => SETTLED.has(card.state) && card.due < end)
		.map((card) => card.cardId);
}

// A due card is skipped when its related group used the day's scheduled answer on another card.
function closeDay(state: AppState, day: string) {
	for (const cardId of state.openDue) {
		const card = state.cards.get(cardId)!;
		if (card.scheduledDay === day) state.cards.set(cardId, { ...card, relatedSkips: 0 });
		else if (state.groupDay.get(contentOf(cardId)) === day && SETTLED.has(card.state))
			state.cards.set(cardId, { ...card, relatedSkips: card.relatedSkips + 1 });
	}
}

export function advanceDays(state: AppState, day: string): void {
	if (state.currentDay === null) {
		state.currentDay = day;
		openDay(state, day);
		return;
	}
	while (state.currentDay < day) {
		closeDay(state, state.currentDay);
		state.currentDay = addDays(state.currentDay, 1);
		openDay(state, state.currentDay);
	}
}

// The caller supplies today because replay never reads the clock.
export function advanceTo(state: AppState, today: string, tz: string): AppState {
	const next = structuredClone(state);
	next.lastTz ??= tz;
	advanceDays(next, today);
	return next;
}
