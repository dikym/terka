import { ANSWER_MAX_CHARS, SET_MAX_ITEMS } from "@/rules";
import type { NameDictionary } from "../answers/dictionary";
import { matchRegionCode } from "../answers/match-code";
import { matchName, type MatchType } from "../answers/match-name";
import { matchSet, type SetItem } from "../answers/match-set";
import { matchHolder, matchSpecialCode } from "../answers/match-special";
import type { Bundle } from "../content/schema";
import type { Question } from "../questions/question";

export type Response =
	{ text: string } | { choice: string } | { items: string[] } | { unknown: true };
export type Checked = {
	correct: boolean | null;
	matchType: MatchType;
	typoCost: number;
	acceptedAreaId: string | null;
	confusedWith: string | null;
	correction: string | null;
	setItems: SetItem[] | null;
	setCorrect: number | null;
	setThreshold: number | null;
	rawAnswer: string | null;
};

const WRONG: Checked = {
	correct: false,
	matchType: "none",
	typoCost: 0,
	acceptedAreaId: null,
	confusedWith: null,
	correction: null,
	setItems: null,
	setCorrect: null,
	setThreshold: null,
	rawAnswer: null
};

// Unverified memberships are neither right nor wrong.
const verdict = (matchType: MatchType) =>
	matchType === "unverified" ? null : matchType !== "none";

export function checkAnswer(
	question: Question,
	response: Response,
	bundle: Bundle,
	dictionary: NameDictionary
): Checked {
	if (question.questionType === "intro_read")
		return { ...WRONG, correct: null, matchType: "exact" };
	if ("unknown" in response) return WRONG;
	const answer = question.answer;
	if (answer.kind === "set") {
		if (!("items" in response)) throw new Error("set questions take a list of items");
		const result = matchSet(
			response.items.slice(0, SET_MAX_ITEMS).map((item) => item.slice(0, ANSWER_MAX_CHARS)),
			answer.codeId,
			dictionary
		);
		return {
			...WRONG,
			correct: result.correct,
			setItems: result.items,
			setCorrect: result.setCorrect,
			setThreshold: result.setThreshold
		};
	}
	if ("items" in response) throw new Error("only set questions take a list of items");
	const raw = ("text" in response ? response.text : response.choice).slice(0, ANSWER_MAX_CHARS);
	if (!raw.trim()) throw new Error("empty answers are ignored, not checked");
	const base = { ...WRONG, rawAnswer: raw };
	switch (answer.kind) {
		case "literal": {
			const correct = raw === answer.value;
			return {
				...base,
				correct,
				matchType: correct ? "exact" : "none",
				confusedWith: correct ? null : answer.confusedWith
			};
		}
		case "area": {
			const match = matchName(raw, answer.codeId, dictionary);
			return {
				...base,
				correct: verdict(match.matchType),
				matchType: match.matchType,
				typoCost: match.typoCost,
				acceptedAreaId: match.acceptedAreaId,
				confusedWith: match.confusedWith,
				correction: match.correction
			};
		}
		case "region-code": {
			const match = matchRegionCode(raw, answer.codeIds, bundle);
			return {
				...base,
				correct: match.matchType === "exact",
				matchType: match.matchType,
				confusedWith: match.confusedWith
			};
		}
		case "holder": {
			const match = matchHolder(raw, answer.specialId, bundle);
			return {
				...base,
				correct: match.matchType !== "none",
				matchType: match.matchType,
				typoCost: match.typoCost,
				confusedWith: match.confusedWith,
				correction: match.correction
			};
		}
		case "special-code": {
			const match = matchSpecialCode(raw, answer.specialId, bundle);
			return {
				...base,
				correct: match.matchType === "exact",
				matchType: match.matchType,
				confusedWith: match.confusedWith
			};
		}
	}
}
