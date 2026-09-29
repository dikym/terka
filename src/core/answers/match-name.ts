import { compactName, normalizeName } from "../text";
import type { NameDictionary, NameEntry } from "./dictionary";
import { typoDistance, typoThreshold } from "./typo";

export type MatchType = "exact" | "variant" | "typo" | "unverified" | "none";
export type NameMatch = {
	matchType: MatchType;
	typoCost: number;
	acceptedAreaId: string | null;
	confusedWith: string | null;
	correction: string | null;
	// A bare name that several accepted areas share (kota/kabupaten twins).
	ambiguous: boolean;
	// A typo rejected because another name is within the uniqueness margin.
	tooClose: boolean;
};

const OLD_SPELLING: [RegExp, string][] = [
	[/oe/g, "u"],
	[/dj/g, "j"],
	[/tj/g, "c"],
	[/sj/g, "sy"],
	[/nj/g, "ny"],
	[/ch/g, "kh"]
];
const modernize = (value: string) =>
	OLD_SPELLING.reduce((text, [pattern, next]) => text.replace(pattern, next), value);
const none = (confusedWith: string | null = null, tooClose = false): NameMatch => ({
	matchType: "none",
	typoCost: 0,
	acceptedAreaId: null,
	confusedWith,
	correction: null,
	ambiguous: false,
	tooClose
});

type Role = "accepted" | "pending" | "other";

// SRD 5.1 steps 1–7, stopping at the first step that decides.
export function matchName(
	input: string,
	codeId: string,
	dictionary: NameDictionary,
	options: { allowProvince?: boolean } = {}
): NameMatch {
	const allowProvince = options.allowProvince ?? true;
	const answer = compactName(input);
	if (!answer) return none();
	const prefix = normalizeName(input, false).match(/^(kotamadya|kota|kabupaten|kab) /)?.[1];
	const type = prefix === undefined ? null : prefix.startsWith("kota") ? "kota" : "kabupaten";
	// SRD 5.1 step 1 only strips the prefix before comparing; it does not narrow the dictionary.
	// The prefix instead picks among several accepted hits (kota/kabupaten twins), when one matches.
	const entries = dictionary.entries;
	const role = (entry: NameEntry): Role => {
		const own = entry.owners.find((owner) => owner.codeId === codeId);
		if (entry.kind === "province") return allowProvince && own ? "accepted" : "other";
		if (!own) return "other";
		return own.confidence === "high" ? "accepted" : "pending";
	};
	const exactHit = (entry: NameEntry) => entry.forms.some((form) => compactName(form) === answer);
	const modern = modernize(answer);
	const variantHit = (entry: NameEntry) =>
		entry.variants.some((form) => compactName(form) === answer) ||
		[...entry.forms, ...entry.variants].some((form) => modernize(compactName(form)) === modern);
	// An explicit "kota"/"kabupaten" prefix picks its type among accepted hits, when present;
	// otherwise the first in dictionary order, flagged ambiguous when several areas share the name.
	const accept = (accepted: NameEntry[], matchType: MatchType, typoCost: number): NameMatch => {
		const prefixed = type ? accepted.find((entry) => entry.areaType === type) : undefined;
		const chosen = prefixed ?? accepted[0];
		return {
			matchType,
			typoCost,
			acceptedAreaId: chosen.kind === "area" ? chosen.id : null,
			confusedWith: null,
			correction: chosen.canonical,
			ambiguous: !prefixed && accepted.filter((entry) => entry.kind === "area").length > 1,
			tooClose: false
		};
	};
	const steps: [(entry: NameEntry) => boolean, "exact" | "variant"][] = [
		[exactHit, "exact"],
		[variantHit, "variant"]
	];
	for (const [hit, matchType] of steps) {
		const hits = entries.filter(hit);
		if (!hits.length) continue;
		const accepted = hits.filter((entry) => role(entry) === "accepted");
		if (accepted.length) return accept(accepted, matchType, 0);
		if (hits.some((entry) => role(entry) === "pending"))
			return { ...none(), matchType: "unverified" };
		return none(firstOtherOwner(hits, codeId, dictionary));
	}
	// Score every dictionary form, not only ones sharing the answer's first letter: a closer
	// different-first-letter name must still be able to block the match (SRD 5.1 step 6).
	const scored = entries
		.flatMap((entry) =>
			[...entry.forms, ...entry.variants].map((form) => ({ entry, form: compactName(form) }))
		)
		.map((item) => ({ ...item, cost: typoDistance(answer, item.form) }))
		.sort((a, b) => a.cost - b.cost);
	const best = scored[0];
	if (!best || best.form[0] !== answer[0] || best.cost > typoThreshold(best.form.length))
		return none();
	// Entries sharing the best compact form (twins, a kota and its province) are one candidate;
	// only a different form within one of the best cost blocks it (SRD 5.1 step 6).
	const group = [
		...new Set(scored.filter((item) => item.form === best.form).map((item) => item.entry))
	];
	const accepted = group.filter((entry) => role(entry) === "accepted");
	const pending = !accepted.length && group.every((entry) => role(entry) === "pending");
	if (!accepted.length && !pending) return none();
	if (
		scored.some(
			(item) =>
				item.form !== best.form && !group.includes(item.entry) && item.cost < best.cost + 1
		)
	)
		return none(null, true);
	// A typo of a not-yet-verified (medium) membership is unverified, same as an exact match would be.
	if (pending) return { ...none(), matchType: "unverified" };
	return accept(accepted, "typo", best.cost);
}

// The pair is recorded against the first other code in plates.json order that owns the name as high.
function firstOtherOwner(
	hits: NameEntry[],
	codeId: string,
	dictionary: NameDictionary
): string | null {
	const owners = hits.flatMap((entry) =>
		entry.owners
			.filter((owner) => owner.codeId !== codeId && owner.confidence === "high")
			.map((owner) => owner.codeId)
	);
	return (
		owners.sort(
			(a, b) => (dictionary.codeOrder.get(a) ?? 0) - (dictionary.codeOrder.get(b) ?? 0)
		)[0] ?? null
	);
}
