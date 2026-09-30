import type { Tier } from "../../rules";
import type { Scope } from "../questions/distractors";
import type { QuestionContext, QuestionFormat } from "../questions/question";
import { advanceTo } from "../replay/days";
import type { AppState, CardEntry } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { localDay } from "../time/day";

export type SessionSettings = { scope: Scope; specialEnabled: boolean };
export type SessionContext = { now: number; tz: string; deviceId: string; random: () => number };
export type QueueItem = {
	cardId: string;
	context: QuestionContext;
	slot: "step" | "drill" | "review" | "new";
	format?: QuestionFormat;
	drillPair?: string;
};

export const ACTIVE = new Set<string>(["learning", "relearning", "review", "mature"]);
export const STEPS = new Set<string>(["learning", "relearning"]);
export const SETTLED = new Set<string>(["review", "mature"]);

export const todayOf = (ctx: Pick<SessionContext, "now" | "tz">) => localDay(ctx.now, ctx.tz);
export const contentOf = (cardId: string) => cardId.slice(0, cardId.indexOf("::"));
export const modeOf = (cardId: string) => cardId.slice(cardId.indexOf("::") + 2);
export const isGroupA = (cardId: string) =>
	modeOf(cardId) === "code2region" || modeOf(cardId) === "region2code";
export const isSpecial = (cardId: string) =>
	modeOf(cardId) === "special2holder" || modeOf(cardId) === "holder2special";
export const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const prepare = (state: AppState, ctx: SessionContext) =>
	advanceTo(state, todayOf(ctx), ctx.tz);

export const cardsWhere = (state: AppState, keep: (cardId: string) => boolean): CardEntry[] =>
	[...state.cards.keys()]
		.filter(keep)
		.sort(compareText)
		.map((cardId) => effectiveCard(state, cardId)!);

export const tierOn = (state: AppState, day: string): Tier =>
	state.tier.days.get(day)?.tier ?? state.tier.current;

// A card is shown at most once per session, at its highest priority.
export function uniqueItems(items: QueueItem[]): QueueItem[] {
	const seen = new Set<string>();
	return items.filter((item) => !seen.has(item.cardId) && seen.add(item.cardId));
}
