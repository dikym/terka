import { FORECAST_DAYS, LEECH_LAPSES, SIGHTING_WINDOW_DAYS, WEAKEST_LIMIT } from "@/rules";
import type { AppState } from "../replay/state";
import { ACTIVE, cardsWhere, compareText, todayOf, type SessionContext } from "../session/context";
import { addDays, dayNumber, localDay } from "../time/day";

export function sightingCounts(state: AppState, today: string): Map<string, number> {
	const counts = new Map<string, number>();
	const now = dayNumber(today);
	for (const [regionId, days] of state.sightings) {
		const recent = days.filter((day) => {
			const age = now - dayNumber(day);
			return age >= 0 && age < SIGHTING_WINDOW_DAYS;
		}).length;
		if (recent) counts.set(regionId, recent);
	}
	return counts;
}

export function forecast(state: AppState, ctx: SessionContext, days = FORECAST_DAYS) {
	const today = todayOf(ctx);
	const counts = new Map<string, number>();
	for (const card of cardsWhere(state, () => true)) {
		if (!ACTIVE.has(card.state)) continue;
		const day = card.due <= ctx.now ? today : localDay(card.due, ctx.tz);
		counts.set(day, (counts.get(day) ?? 0) + 1);
	}
	return Array.from({ length: days }, (_, offset) => {
		const day = addDays(today, offset);
		return { localDay: day, due: counts.get(day) ?? 0 };
	});
}

export const weakestCards = (state: AppState, limit = WEAKEST_LIMIT) =>
	[...state.cards.values()]
		.filter((card) => card.wrong > 0)
		.sort((a, b) => b.wrong - a.wrong || b.lapses - a.lapses || compareText(a.cardId, b.cardId))
		.slice(0, limit)
		.map(({ cardId, wrong, answered, lapses }) => ({ cardId, wrong, answered, lapses }));

export const hardCards = (state: AppState) =>
	[...state.cards.values()]
		.filter((card) => card.lapses >= LEECH_LAPSES)
		.sort((a, b) => b.lapses - a.lapses || compareText(a.cardId, b.cardId))
		.map((card) => ({
			cardId: card.cardId,
			lapses: card.lapses,
			suspended: card.state === "suspended"
		}));
