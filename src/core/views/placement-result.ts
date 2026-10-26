import { SUGGESTED_GROUP_ORDER, type Tier } from "@/rules";
import type { Bundle, Region } from "../content/schema";
import { eligibleRegions, NATIONAL, type Scope } from "../questions/distractors";

type PlacementAnswer = { codeId: string; stage: 1 | 2 | 3; correct: boolean; seeded: boolean };
const TIERS = ["common", "medium", "rare"] as const;

// Ahli already knows most codes, so new material can open anywhere. Menengah and mahir start where
// the most codes are still new; a handful of test answers per group is too few to rank weakness.
function suggest(
	bundle: Bundle,
	regions: Map<string, Region>,
	answers: PlacementAnswer[],
	level: Tier
): Scope {
	if (level === "pemula") return { level: "group", id: SUGGESTED_GROUP_ORDER[0] };
	if (level === "ahli") return NATIONAL;
	const known = new Set(answers.filter((answer) => answer.seeded).map((answer) => answer.codeId));
	let best = SUGGESTED_GROUP_ORDER[0];
	let most = -1;
	for (const group of bundle.groups) {
		const left = [...regions.values()].filter(
			(region) => region.group === group.id && !known.has(region.id)
		).length;
		if (left > most) {
			best = group.id;
			most = left;
		}
	}
	return { level: "group", id: best };
}

export function placementResult(bundle: Bundle, answers: PlacementAnswer[], level: Tier) {
	const regions = new Map(eligibleRegions(bundle).map((region) => [region.id, region]));
	let known = 0;
	for (const tier of TIERS) {
		const asked = answers.filter(
			(answer) => regions.get(answer.codeId)?.placementTier === tier
		);
		if (!asked.length) continue;
		const size = [...regions.values()].filter((region) => region.placementTier === tier).length;
		known += (asked.filter((answer) => answer.correct).length / asked.length) * size;
	}
	return {
		level,
		knownPercent: regions.size ? Math.round((known / regions.size) * 100) : 0,
		seededCount: answers.filter((answer) => answer.seeded).length,
		suggestedScope: suggest(bundle, regions, answers, level)
	};
}
