import { SET_THRESHOLD_MAX } from "@/rules";
import type { NameDictionary } from "./dictionary";
import { matchName, type MatchType } from "./match-name";

export type SetItem = [
	raw: string,
	acceptedAreaId: string | null,
	matchType: MatchType,
	typoCost: number,
	confusedWith: string | null
];
export type SetResult = {
	setCorrect: number;
	setThreshold: number;
	correct: boolean;
	items: SetItem[];
	confusions: string[];
};

export const setThreshold = (memberCount: number) => Math.min(SET_THRESHOLD_MAX, memberCount - 1);

export const memberCount = (dictionary: NameDictionary, codeId: string) =>
	dictionary.entries.filter(
		(entry) =>
			entry.kind === "area" &&
			entry.owners.some((owner) => owner.codeId === codeId && owner.confidence === "high")
	).length;

export function matchSet(inputs: string[], codeId: string, dictionary: NameDictionary): SetResult {
	const accepted = new Set<string>();
	const confusions: string[] = [];
	const items = inputs.map((raw): SetItem => {
		const match = matchName(raw, codeId, dictionary, { allowProvince: false });
		if (match.confusedWith && !confusions.includes(match.confusedWith))
			confusions.push(match.confusedWith);
		const areaId = match.acceptedAreaId;
		const isNameMatch =
			match.matchType === "exact" ||
			match.matchType === "variant" ||
			match.matchType === "typo";
		// A bare twin name counts once, as the first accepted area in dictionary order.
		if (isNameMatch && areaId !== null) {
			accepted.add(areaId);
			return [raw, areaId, match.matchType, match.typoCost, null];
		}
		return [
			raw,
			null,
			match.matchType === "unverified" ? "unverified" : "none",
			0,
			match.confusedWith
		];
	});
	const threshold = setThreshold(memberCount(dictionary, codeId));
	return {
		setCorrect: accepted.size,
		setThreshold: threshold,
		correct: accepted.size >= threshold,
		items,
		confusions
	};
}
