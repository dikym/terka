import { LEECH_LAPSES, LOGIN_PROMPT_ACTIVE_DAYS, NOTE_OFFER_LAPSES } from "@/rules";
import type { AppState } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { compareText, contentOf } from "../session/context";

// One note per code: offered at four lapses and once more at six, never over an existing note.
export function noteOffer(
	state: AppState,
	codeId: string,
	hasNote: boolean,
	offeredAt: readonly number[]
): 4 | 6 | null {
	if (hasNote) return null;
	const lapses = Math.max(
		0,
		...[...state.cards.values()]
			.filter((card) => contentOf(card.cardId) === codeId)
			.map((card) => card.lapses)
	);
	if (lapses >= LEECH_LAPSES && !offeredAt.includes(LEECH_LAPSES)) return 6;
	if (lapses >= LEECH_LAPSES) return null;
	if (lapses >= NOTE_OFFER_LAPSES && !offeredAt.includes(NOTE_OFFER_LAPSES)) return 4;
	return null;
}

const UNLEARNED = new Set(["new", "locked"]);

// Only cards that were being learned; a data change on untouched material is not news to the user.
// The key names one suspension: a leech by the card's reps, a data drop by the content revision,
// so a later suspension of the same card is announced again.
export function pendingNotices(state: AppState, notified: ReadonlySet<string>, contentRev: number) {
	const notices: {
		cardId: string;
		reason: "leech" | "confidence" | "missing-data";
		key: string;
	}[] = [];
	for (const cardId of [...state.cards.keys()].sort(compareText)) {
		const card = effectiveCard(state, cardId)!;
		const suspension = card.suspension;
		if (card.state !== "suspended" || !suspension || suspension.reason === "manual") continue;
		const key = `${cardId}|${suspension.reason}|${suspension.reason === "leech" ? card.reps : contentRev}`;
		if (UNLEARNED.has(suspension.resume) || notified.has(key)) continue;
		notices.push({ cardId, reason: suspension.reason, key });
	}
	return notices;
}

export const loginPromptDue = (state: AppState, signedIn: boolean, dismissed: boolean) =>
	!signedIn && !dismissed && state.activeDays.size >= LOGIN_PROMPT_ACTIVE_DAYS;
