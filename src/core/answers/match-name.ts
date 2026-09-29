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
	ambiguous: boolean;
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
const none = (confusedWith: string | null = null, ambiguous = false): NameMatch => ({
	matchType: "none",
	typoCost: 0,
	acceptedAreaId: null,
	confusedWith,
	correction: null,
	ambiguous
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
	const steps: [(entry: NameEntry) => boolean, "exact" | "variant"][] = [
		[exactHit, "exact"],
		[variantHit, "variant"]
	];
	for (const [hit, matchType] of steps) {
		const hits = entries.filter(hit);
		if (!hits.length) continue;
		const accepted = hits.filter((entry) => role(entry) === "accepted");
		if (accepted.length) {
			// An explicit "kota"/"kabupaten" prefix picks its type among accepted hits, when present.
			const prefixed = type ? accepted.find((entry) => entry.areaType === type) : undefined;
			const chosen = prefixed ?? accepted[0];
			return {
				matchType,
				typoCost: 0,
				acceptedAreaId: chosen.kind === "area" ? chosen.id : null,
				confusedWith: null,
				correction: chosen.canonical,
				ambiguous: prefixed ? false : accepted.length > 1
			};
		}
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
	const bestRole = best ? role(best.entry) : "other";
	if (
		!best ||
		best.form[0] !== answer[0] ||
		(bestRole !== "accepted" && bestRole !== "pending") ||
		best.cost > typoThreshold(best.form.length)
	)
		return none();
	if (scored.some((item) => item.entry !== best.entry && item.cost < best.cost + 1))
		return none(null, true);
	// A typo of a not-yet-verified (medium) membership is unverified, same as an exact match would be.
	if (bestRole === "pending") return { ...none(), matchType: "unverified" };
	return {
		matchType: "typo",
		typoCost: best.cost,
		acceptedAreaId: best.entry.kind === "area" ? best.entry.id : null,
		confusedWith: null,
		correction: best.entry.canonical,
		ambiguous: false
	};
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
