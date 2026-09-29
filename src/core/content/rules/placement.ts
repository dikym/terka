import type { ContentDraft } from "../draft";
import { error, type ContentMessage } from "../messages";

const TIER_MINIMUM = { common: 8, medium: 10, rare: 10 } as const;
const MAX_MEDIUM_GROUPS = 10;

export function placementRules({ curation }: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	for (const [tier, minimum] of Object.entries(TIER_MINIMUM)) {
		const size = curation.regions.filter((region) => region.placementTier === tier).length;
		if (size < minimum)
			out.push(
				error(
					"placement-tier-size",
					`placement tier ${tier} has ${size} codes; needs ${minimum}`
				)
			);
	}
	const groups = new Set(
		curation.regions
			.filter((region) => region.placementTier === "medium")
			.map((region) => region.group)
	);
	if (groups.size > MAX_MEDIUM_GROUPS)
		out.push(
			error(
				"placement-medium-groups",
				`tier medium spans ${groups.size} groups; stage 2 fits ${MAX_MEDIUM_GROUPS}`
			)
		);
	return out;
}
