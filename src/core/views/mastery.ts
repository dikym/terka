import type { Bundle } from "../content/schema";
import { inScope, type Scope } from "../questions/distractors";
import { MATURE_INTERVAL_DAYS } from "@/rules";
import type { AppState, CardEntry } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { contentOf, modeOf } from "../session/context";

export type Mastery = {
	counted: number;
	mature: number;
	percent: number | null;
	mastered: boolean;
};

const REGION_MODES = new Set(["code2region", "region2code", "setrecall"]);
const SPECIAL_MODES = new Set(["special2holder", "holder2special"]);
const LEFT_OUT = new Set(["locked", "suspended"]);

// A card grows toward full as its interval nears maturity; only a mature card is worth all of it.
function weight(card: CardEntry): number {
	if (card.state === "mature") return 1;
	if (card.state !== "review" && card.state !== "relearning") return 0;
	return Math.min(card.intervalDays, MATURE_INTERVAL_DAYS - 1) / MATURE_INTERVAL_DAYS;
}

const percentOf = (progress: number, mature: number, counted: number) =>
	mature === counted ? 100 : Math.min(99, Math.round((progress / counted) * 100));

function measure(state: AppState, cardIds: string[], codes: ReadonlySet<string> | null): Mastery {
	let counted = 0;
	let mature = 0;
	let progress = 0;
	for (const cardId of cardIds) {
		const card = effectiveCard(state, cardId)!;
		if (LEFT_OUT.has(card.state)) continue;
		counted++;
		progress += weight(card);
		if (card.state === "mature") mature++;
	}
	// A pair counts against every scope holding either of its codes.
	const confused =
		codes !== null &&
		[...state.pairs].some(
			([key, pair]) => pair.flagged && key.split(">").some((code) => codes.has(code))
		);
	return {
		counted,
		mature,
		percent: counted ? percentOf(progress, mature, counted) : null,
		mastered: counted > 0 && mature === counted && !confused
	};
}

export function scopeMastery(state: AppState, bundle: Bundle, scope: Scope): Mastery {
	const codes = new Set(
		bundle.regions.filter((region) => inScope(region, scope)).map((region) => region.id)
	);
	const cardIds = [...state.cards.keys()].filter(
		(cardId) => REGION_MODES.has(modeOf(cardId)) && codes.has(contentOf(cardId))
	);
	return measure(state, cardIds, codes);
}

export function masteryMap(state: AppState, bundle: Bundle) {
	const groups = new Map<string, Mastery>();
	const provinces = new Map<string, Mastery>();
	for (const region of bundle.regions) {
		if (!groups.has(region.group))
			groups.set(
				region.group,
				scopeMastery(state, bundle, { level: "group", id: region.group })
			);
		if (!provinces.has(region.province))
			provinces.set(
				region.province,
				scopeMastery(state, bundle, { level: "province", id: region.province })
			);
	}
	return { groups, provinces };
}

export const specialMastery = (state: AppState) =>
	measure(
		state,
		[...state.cards.keys()].filter((cardId) => SPECIAL_MODES.has(modeOf(cardId))),
		null
	);

export function levelIndicator(state: AppState): { 1: number; 2: number; 3: number } {
	const learned = [...state.cards.keys()]
		.filter((cardId) => REGION_MODES.has(modeOf(cardId)))
		.map((cardId) => effectiveCard(state, cardId)!)
		.filter((card) => !LEFT_OUT.has(card.state) && card.state !== "new");
	const share = (index: 0 | 1 | 2) =>
		learned.length
			? Math.round(
					(learned.filter((card) => card.passedLevels[index]).length / learned.length) *
						100
				)
			: 0;
	return { 1: share(0), 2: share(1), 3: share(2) };
}
