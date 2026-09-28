import type { Grade, RawReview, Target } from "./model";
import { typoThreshold } from "../../rules";

export function normalizeName(value: string, stripAdministration = true): string {
	let normalized = value
		.normalize("NFKC")
		.toLocaleLowerCase("id-ID")
		.replace(/[\p{P}\p{S}]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (stripAdministration)
		normalized = normalized.replace(/^(?:kotamadya|kabupaten|kota|kab)\s+/, "");
	return normalized;
}

const compact = (value: string) => normalizeName(value).replace(/ /g, "");
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

const KEY_POSITION = new Map(
	["qwertyuiop", "asdfghjkl", "zxcvbnm"].flatMap((row, rowIndex) =>
		[...row].map((key, column) => [key, [rowIndex, column + rowIndex * 0.5]] as const)
	)
);
function adjacentKeys(a: string, b: string): boolean {
	const p = KEY_POSITION.get(a);
	const q = KEY_POSITION.get(b);
	if (!p || !q) return false;
	const rows = Math.abs(p[0] - q[0]);
	const columns = Math.abs(p[1] - q[1]);
	return (rows === 0 && columns === 1) || (rows === 1 && columns <= 0.5);
}

// SRD 5.1: weighted Damerau-Levenshtein; transpositions, neighbouring keys and doubled letters cost 0.5.
export function typoDistance(a: string, b: string): number {
	const d = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);
	for (let i = 1; i <= a.length; i++)
		for (let j = 1; j <= b.length; j++) {
			const substitute =
				a[i - 1] === b[j - 1] ? 0 : adjacentKeys(a[i - 1], b[j - 1]) ? 0.5 : 1;
			const remove = i > 1 && a[i - 1] === a[i - 2] ? 0.5 : 1;
			const insert = j > 1 && b[j - 1] === b[j - 2] ? 0.5 : 1;
			d[i][j] = Math.min(
				d[i - 1][j] + remove,
				d[i][j - 1] + insert,
				d[i - 1][j - 1] + substitute
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
		}
	return d[a.length][b.length];
}

export type MatchType = "exact" | "variant" | "typo" | "none";
export type Match = {
	correct: boolean;
	fuzzy: boolean;
	matchType: MatchType;
	typoCost: number;
	matchedId: string | null;
	confusedWith: string[];
	correction: string | null;
	ambiguous: boolean;
};

export function matchAnswer(
	input: string,
	targets: Target[],
	dictionary: Target[],
	kind: "name" | "code" | "literal"
): Match {
	const result: Match = {
		correct: false,
		fuzzy: false,
		matchType: "none",
		typoCost: 0,
		matchedId: null,
		confusedWith: [],
		correction: null,
		ambiguous: false
	};
	const regionOf = (target: Target) => target.id.split("::")[0];
	if (kind !== "name") {
		// SRD 5.1: codes compare uppercase without spaces and never tolerate typos.
		const normalize =
			kind === "code"
				? (text: string) => text.toUpperCase().replace(/\s+/g, "")
				: (text: string) => text.trim().toUpperCase();
		const answer = normalize(input);
		if (!answer) return result;
		const hits = (pool: Target[]) =>
			pool.filter((target) =>
				[target.name, ...target.aliases].some((name) => normalize(name) === answer)
			);
		const [hit] = hits(targets);
		if (hit)
			return {
				...result,
				correct: true,
				matchType: "exact",
				matchedId: hit.id,
				correction: hit.name
			};
		return { ...result, confusedWith: [...new Set(hits(dictionary).map(regionOf))] };
	}
	const answer = compact(input);
	if (!answer) return result;
	const administration = (name: string) =>
		normalizeName(name, false)
			.match(/^(kota|kabupaten|kab)\s/)?.[1]
			.replace("kabupaten", "kab");
	const explicit = administration(input);
	targets = targets.filter(
		(target) =>
			!explicit || !administration(target.name) || administration(target.name) === explicit
	);
	const forms = (target: Target) => [target.name, ...target.aliases];
	const exactHit = (target: Target) => forms(target).some((form) => compact(form) === answer);
	const variantHit = (target: Target) =>
		(target.variants ?? []).some((form) => compact(form) === answer) ||
		[...forms(target), ...(target.variants ?? [])].some(
			(form) => modernize(compact(form)) === modernize(answer)
		);
	const settle = (matches: Target[], matchType: MatchType): Match | null => {
		if (!matches.length) return null;
		if (new Set(matches.map((target) => target.id)).size > 1)
			return { ...result, ambiguous: true };
		return {
			...result,
			correct: true,
			matchType,
			matchedId: matches[0].id,
			correction: matches[0].name
		};
	};
	let exact = targets.filter(exactHit);
	if (exact.length > 1) {
		const specific = exact.filter((target) =>
			forms(target).some((form) => normalizeName(form, false) === normalizeName(input, false))
		);
		if (specific.length) exact = specific;
	}
	const direct = settle(exact, "exact") ?? settle(targets.filter(variantHit), "variant");
	if (direct) return direct;
	const others = dictionary.filter((target) => exactHit(target) || variantHit(target));
	if (others.length) return { ...result, confusedWith: [...new Set(others.map(regionOf))] };
	// SRD 5.1 step 6: typo tolerance, closest name must be accepted and at least 1 ahead of any other name.
	const accepted = new Set(
		targets.flatMap((target) => [...forms(target), ...(target.variants ?? [])].map(compact))
	);
	const scored = [...targets, ...dictionary]
		.flatMap((target) =>
			[...forms(target), ...(target.variants ?? [])].map((form) => ({
				target,
				form: compact(form)
			}))
		)
		.filter(({ form }) => form[0] === answer[0])
		.map((entry) => ({ ...entry, cost: typoDistance(answer, entry.form) }))
		.sort((a, b) => a.cost - b.cost);
	const best = scored[0];
	if (!best || !accepted.has(best.form) || best.cost > typoThreshold(best.form.length))
		return result;
	if (scored.some((entry) => !accepted.has(entry.form) && entry.cost < best.cost + 1))
		return result;
	const winners = targets.filter((target) =>
		[...forms(target), ...(target.variants ?? [])].some((form) => compact(form) === best.form)
	);
	const tied = scored.filter((entry) => entry.cost === best.cost && accepted.has(entry.form));
	const tiedTargets = new Set(
		targets
			.filter((target) =>
				tied.some((entry) =>
					[...forms(target), ...(target.variants ?? [])].map(compact).includes(entry.form)
				)
			)
			.map((target) => target.id)
	);
	if (tiedTargets.size > 1) return { ...result, ambiguous: true };
	return {
		...result,
		correct: true,
		fuzzy: true,
		matchType: "typo",
		typoCost: best.cost,
		matchedId: winners[0].id,
		correction: winners[0].name
	};
}

export function percentile(values: number[], fraction: number): number {
	if (!values.length) throw new Error("A percentile requires samples");
	const sorted = [...values].sort((a, b) => a - b);
	const index = (sorted.length - 1) * fraction;
	const lower = Math.floor(index);
	return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}

export function gradeAnswer(review: RawReview, history: RawReview[]): Grade {
	if (review.timedOut) return 1;
	if (review.setCorrect !== null && review.setTarget !== null) {
		if (review.setCorrect === 0) return 1;
		return review.setCorrect < review.setTarget
			? 2
			: review.setCorrect >= review.setTarget + 2
				? 4
				: 3;
	}
	if (!review.correct) return 1;
	// SRD 4.4: interrupted or untimed answers are Good and never compared.
	if (review.elapsedMs > 60_000 || review.msToFirstKey === null) return 3;
	const index = history.findIndex((item) => item.id === review.id);
	const preceding = index < 0 ? history : history.slice(0, index);
	const samples = preceding
		.filter(
			(item) =>
				item.ts <= review.ts &&
				!item.intro &&
				item.level === review.level &&
				item.correct &&
				!item.timedOut &&
				item.setTarget === null &&
				item.msToFirstKey !== null &&
				item.elapsedMs <= 60_000
		)
		.slice(-200)
		.map((item) => item.msToFirstKey!);
	const latency =
		samples.length < 30
			? 0
			: review.msToFirstKey < percentile(samples, 0.2)
				? 2
				: review.msToFirstKey > percentile(samples, 0.8)
					? -2
					: 0;
	const score = latency - (review.fuzzy ? 1 : 0);
	return score >= 2 ? 4 : score >= 0 ? 3 : 2;
}
