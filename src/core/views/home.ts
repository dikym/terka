import type { Bundle } from "../content/schema";
import { inScope } from "../questions/distractors";
import { streak, streakDays } from "../replay/streak";
import type { AppState } from "../replay/state";
import {
	ACTIVE,
	cardsWhere,
	contentOf,
	isGroupA,
	isSpecial,
	modeOf,
	todayOf,
	type SessionContext,
	type SessionSettings
} from "../session/context";
import { challengeQueue } from "../session/modes";
import { placementAvailable } from "../session/placement";
import { dailyQueue, specialQueue } from "../session/queue";

export type HomeSummary = {
	due: number;
	newAvailable: number;
	held: boolean;
	allIntroduced: boolean;
	nextDueAt: number | null;
	specialDue: number | null;
	challenge: "available" | "done" | "empty";
	placementOffer: boolean;
	streak: number;
};

export function homeSummary(
	state: AppState,
	bundle: Bundle,
	settings: SessionSettings,
	ctx: SessionContext
): HomeSummary {
	const daily = dailyQueue(state, bundle, settings, ctx);
	const due = daily.items.filter((item) => item.slot !== "new").length;
	const regions = new Map(bundle.regions.map((region) => [region.id, region]));
	const allIntroduced = !cardsWhere(state, (cardId) => modeOf(cardId) === "code2region").some(
		(card) => {
			const region = regions.get(contentOf(card.cardId));
			return card.state === "new" && region !== undefined && inScope(region, settings.scope);
		}
	);
	const upcoming = cardsWhere(state, isGroupA)
		.filter((card) => ACTIVE.has(card.state) && card.due > ctx.now)
		.map((card) => card.due);
	const specialLearned = cardsWhere(state, isSpecial).some((card) => ACTIVE.has(card.state));
	const challenge = challengeQueue(state, ctx);
	return {
		due,
		newAvailable: daily.items.length - due,
		held: daily.held,
		allIntroduced,
		nextDueAt: upcoming.length ? Math.min(...upcoming) : null,
		specialDue:
			settings.specialEnabled || specialLearned
				? specialQueue(state, bundle, settings, ctx).items.filter(
						(item) => item.slot !== "new"
					).length
				: null,
		challenge: Array.isArray(challenge) ? "available" : challenge.unavailable,
		placementOffer: placementAvailable(state),
		streak: streak(streakDays(state), todayOf(ctx))
	};
}
