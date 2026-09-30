import { SET_MIN_AREAS } from "../../rules";
import { highMembers } from "../answers/dictionary";
import type { Bundle } from "../content/schema";
import type { CardMode } from "../questions/question";
import { suspend } from "../scheduling/card";
import type { AppState, CardEntry, ContentStatus } from "./state";

export const trackOf = (mode: CardMode): "region" | "special" =>
	mode === "special2holder" || mode === "holder2special" ? "special" : "region";

export function universe(bundle: Bundle): { cardId: string; locked: boolean }[] {
	const cards: { cardId: string; locked: boolean }[] = [];
	for (const region of bundle.regions) {
		if (region.confidence !== "high") continue;
		cards.push(
			{ cardId: `${region.id}::code2region`, locked: false },
			{ cardId: `${region.id}::region2code`, locked: true }
		);
		if (highMembers(bundle, region).length >= SET_MIN_AREAS)
			cards.push({ cardId: `${region.id}::setrecall`, locked: true });
	}
	for (const special of bundle.specials) {
		if (special.confidence !== "high" || special.needsReview) continue;
		cards.push(
			{ cardId: `${special.id}::special2holder`, locked: false },
			{ cardId: `${special.id}::holder2special`, locked: true }
		);
	}
	return cards;
}

export function contentIndex(bundle: Bundle): Map<string, ContentStatus> {
	const index = new Map<string, ContentStatus>();
	for (const region of bundle.regions)
		index.set(region.id, region.confidence === "high" ? "ok" : "confidence");
	for (const special of bundle.specials)
		index.set(
			special.id,
			special.confidence === "high" && !special.needsReview ? "ok" : "confidence"
		);
	return index;
}

// Content problems suspend the card only when read, so the stored history stays intact
// and the card comes back by itself when the data does.
export function effectiveCard(state: AppState, cardId: string): CardEntry | undefined {
	const card = state.cards.get(cardId);
	if (!card) return undefined;
	const status = state.content.get(cardId.slice(0, cardId.indexOf("::"))) ?? "missing-data";
	return status === "ok" ? card : { ...card, ...suspend(card, status) };
}
