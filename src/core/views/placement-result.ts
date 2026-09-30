import { SUGGESTED_GROUP_ORDER, type Tier } from "@/rules";
import type { Bundle, Region } from "../content/schema";
import { eligibleRegions, type Scope } from "../questions/distractors";

type PlacementAnswer = { codeId: string; stage: 1 | 2 | 3; correct: boolean; seeded: boolean };
const TIERS = ["common", "medium", "rare"] as const;

function suggest(
	bundle: Bundle,
	regions: Map<string, Region>,
	answers: PlacementAnswer[],
	level: Tier
): Scope {
	if (level === "pemula") return { level: "group", id: SUGGESTED_GROUP_ORDER[0] };
	const tally = new Map<string, { asked: number; correct: number }>();
	for (const answer of answers) {
		const group = regions.get(answer.codeId)?.group;
		if (answer.stage === 1 || !group) continue;
		const entry = tally.get(group) ?? { asked: 0, correct: 0 };
		tally.set(group, {
			asked: entry.asked + 1,
			correct: entry.correct + (answer.correct ? 1 : 0)
		});
	}
	const order = [
		...new Set([...SUGGESTED_GROUP_ORDER, ...bundle.regions.map((region) => region.group)])
	];
	let best: string | null = null;
	let bestShare = Infinity;
	for (const group of order) {
		const entry = tally.get(group);
		if (!entry) continue;
		const share = entry.correct / entry.asked;
		if (share < bestShare) {
			best = group;
			bestShare = share;
		}
	}
	return { level: "group", id: best ?? SUGGESTED_GROUP_ORDER[0] };
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
