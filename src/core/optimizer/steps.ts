import type { CountedAnswer } from "./counted";

const HEADER = "card_id,review_time,review_rating,review_state,review_duration";
// Revlog states the step estimator reads: 0 new, 1 learning, 2 review, 3 relearning.
type RevlogState = 0 | 1 | 2 | 3;

export function revlogCsv(counted: readonly CountedAnswer[]): Uint8Array {
	const cardNumbers = new Map<string, number>();
	const reviewed = new Set<string>();
	const seen = new Set<string>();
	const rows = [HEADER];
	for (const answer of [...counted].sort((a, b) => a.at - b.at)) {
		if (!cardNumbers.has(answer.cardId)) cardNumbers.set(answer.cardId, cardNumbers.size);
		let state: RevlogState;
		if (answer.settled) state = 2;
		else if (!seen.has(answer.cardId)) state = 0;
		else state = reviewed.has(answer.cardId) ? 3 : 1;
		seen.add(answer.cardId);
		if (answer.settled) reviewed.add(answer.cardId);
		rows.push(
			`${cardNumbers.get(answer.cardId)},${answer.at},${answer.grade},${state},${answer.msTotal}`
		);
	}
	return new TextEncoder().encode(rows.join("\n"));
}
