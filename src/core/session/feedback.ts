import { areaDisplayName, highMembers, type NameDictionary } from "../answers/dictionary";
import { matchName } from "../answers/match-name";
import type { Bundle } from "../content/schema";
import type { Question } from "../questions/question";
import type { Checked } from "./check";

// After a correct Tebak daerah the result also names a few other areas of the same code.
export function alsoCorrect(
	bundle: Bundle,
	question: Question,
	checked: Checked,
	limit = 3
): string[] {
	if (question.answer.kind !== "area" || checked.correct !== true) return [];
	const { codeId } = question.answer;
	const region = bundle.regions.find((item) => item.id === codeId);
	if (!region) return [];
	return highMembers(bundle, region)
		.filter((area) => area.id !== checked.acceptedAreaId)
		.slice(0, limit)
		.map((area) => area.name);
}

/** One answer of a list: counted, a repeat of one that counted, or wrong with the reason. */
export type SetItemFeedback = {
	text: string;
	status: "counted" | "repeat" | "wrong";
	reason: string | null;
};

export type SetFeedback = {
	/** Areas that counted, and how many were needed. */
	counted: number;
	needed: number;
	/** Every answer, in the order it was sent. */
	items: SetItemFeedback[];
	/** Areas of the code that were not named, and all of its areas. */
	missing: string[];
	all: string[];
};

// A name the dictionary knows but a list does not take, a code's other users, or nothing at all.
function reasonNotCounted(
	bundle: Bundle,
	dictionary: NameDictionary,
	codeId: string,
	raw: string,
	unverified: boolean,
	confusedWith: string | null
): string {
	const region = bundle.regions.find((item) => item.id === codeId);
	if (unverified) return "datanya belum terverifikasi penuh";
	const wide = matchName(raw, codeId, dictionary);
	if (wide.matchType === "exact" || wide.matchType === "variant" || wide.matchType === "typo")
		return "nama provinsi atau julukan, bukan kab/kota";
	const other = confusedWith ? bundle.regions.find((item) => item.id === confusedWith) : null;
	return other ? `dipakai kode ${other.code}` : `bukan daerah yang memakai ${region?.code ?? ""}`;
}

/** After a Sebutkan answer: how many counted, what did not and why, and what was left out. */
export function setFeedback(
	bundle: Bundle,
	dictionary: NameDictionary,
	question: Question,
	checked: Checked
): SetFeedback | null {
	if (question.answer.kind !== "set") return null;
	const { setItems, setCorrect, setThreshold } = checked;
	if (!setItems || setCorrect === null || setThreshold === null) return null;
	const { codeId } = question.answer;
	const region = bundle.regions.find((item) => item.id === codeId);
	if (!region) return null;
	const named = new Set<string>();
	const items = setItems.map(([raw, areaId, matchType, , confusedWith]): SetItemFeedback => {
		if (areaId === null)
			return {
				text: raw,
				status: "wrong",
				reason: reasonNotCounted(
					bundle,
					dictionary,
					codeId,
					raw,
					matchType === "unverified",
					confusedWith
				)
			};
		if (named.has(areaId)) return { text: raw, status: "repeat", reason: "sudah disebut" };
		named.add(areaId);
		return { text: raw, status: "counted", reason: null };
	});
	const members = highMembers(bundle, region);
	return {
		counted: setCorrect,
		needed: setThreshold,
		items,
		missing: members.filter((area) => !named.has(area.id)).map(areaDisplayName),
		all: members.map(areaDisplayName)
	};
}
