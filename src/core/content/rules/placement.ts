import { PLACEMENT_STAGE_SIZES } from "../../../rules";
import type { ContentDraft } from "../draft";
import { error, type ContentMessage } from "../messages";

export function placementRules({ curation }: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	for (const [tier, minimum] of Object.entries(PLACEMENT_STAGE_SIZES)) {
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
	if (groups.size > PLACEMENT_STAGE_SIZES.medium)
		out.push(
			error(
				"placement-medium-groups",
				`tier medium spans ${groups.size} groups; stage 2 fits ${PLACEMENT_STAGE_SIZES.medium}`
			)
		);
	return out;
}
