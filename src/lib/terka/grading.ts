import type { Grade, RawReview, Target } from "./model";

export function normalizeName(value: string, stripAdministration = true): string {
	let normalized = value
		.normalize("NFKC")
		.toLocaleLowerCase("id-ID")
		.replace(/[\p{P}\p{S}]/gu, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (stripAdministration) normalized = normalized.replace(/^(?:kota|kabupaten|kab)\s+/, "");
	return normalized;
}

function distance(a: string, b: string): number {
	let row = Array.from({ length: b.length + 1 }, (_, index) => index);
	for (let i = 1; i <= a.length; i++) {
		const next = [i];
		for (let j = 1; j <= b.length; j++)
			next[j] = Math.min(
				next[j - 1] + 1,
				row[j] + 1,
				row[j - 1] + Number(a[i - 1] !== b[j - 1])
			);
		row = next;
	}
	return row[b.length];
}

export type Match = {
	correct: boolean;
	fuzzy: boolean;
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
		matchedId: null,
		confusedWith: [],
		correction: null,
		ambiguous: false
	};
	const normalize = kind === "name" ? normalizeName : (text: string) => text.trim().toUpperCase();
	const answer = normalize(input);
	if (!answer) return result;
	const names = (target: Target) => [target.name, ...target.aliases];
	if (kind === "name") {
		const administration = (name: string) =>
			normalizeName(name, false)
				.match(/^(kota|kabupaten|kab)\s/)?.[1]
				.replace("kabupaten", "kab");
		const explicit = administration(input);
		targets = targets.filter(
			(target) =>
				!explicit ||
				!administration(target.name) ||
				administration(target.name) === explicit
		);
	}
	let exact = targets.filter((target) =>
		names(target).some((name) => normalize(name) === answer)
	);
	if (kind === "name" && exact.length > 1) {
		const specific = exact.filter((target) =>
			names(target).some((name) => normalizeName(name, false) === normalizeName(input, false))
		);
		if (specific.length) exact = specific;
	}
	if (new Set(exact.map((target) => target.id)).size > 1) return { ...result, ambiguous: true };
	if (exact.length)
		return { ...result, correct: true, matchedId: exact[0].id, correction: exact[0].name };
	const others = dictionary.filter((target) =>
		names(target).some((name) => normalize(name) === answer)
	);
	if (others.length)
		return {
			...result,
			confusedWith: [...new Set(others.map((target) => target.id.split("::")[0]))]
		};
	if (kind !== "name") return result;
	const threshold = answer.length < 8 ? 1 : 2;
	const candidates = targets
		.flatMap((target) =>
			names(target)
				.map((name) => normalize(name))
				.filter(
					(name) =>
						name[0] === answer[0] && Math.abs(name.length - answer.length) <= threshold
				)
				.map((name) => ({ target, distance: distance(answer, name) }))
		)
		.filter((candidate) => candidate.distance <= threshold)
		.sort((a, b) => a.distance - b.distance);
	if (!candidates.length) return result;
	const best = candidates.filter((candidate) => candidate.distance === candidates[0].distance);
	if (new Set(best.map((candidate) => candidate.target.id)).size > 1)
		return { ...result, ambiguous: true };
	return {
		...result,
		correct: true,
		fuzzy: true,
		matchedId: best[0].target.id,
		correction: best[0].target.name
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
		if (review.fuzzy) return 2;
		return review.setCorrect < review.setTarget
			? 2
			: review.setCorrect >= review.setTarget + 2
				? 4
				: 3;
	}
	if (!review.correct) return 1;
	if (review.fuzzy) return 2;
	if (review.elapsedMs > 60_000 || review.msToFirstKey === null) return 3;
	const index = history.findIndex((item) => item.id === review.id);
	const preceding = index < 0 ? history : history.slice(0, index);
	const samples = preceding
		.filter(
			(item) =>
				item.ts <= review.ts &&
				item.level === review.level &&
				item.correct &&
				!item.timedOut &&
				item.setTarget === null &&
				item.msToFirstKey !== null &&
				item.elapsedMs <= 60_000
		)
		.slice(-200)
		.map((item) => item.msToFirstKey!);
	if (samples.length < 30) return 3;
	if (review.msToFirstKey < percentile(samples, 0.2)) return 4;
	if (review.msToFirstKey > percentile(samples, 0.8)) return 2;
	return 3;
}
