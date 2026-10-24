import { NATIONAL } from "../../questions/distractors";
import { type ContentMessage, error } from "../messages";
import type { Bundle } from "../schema";

export const coverageIds = (bundle: Bundle): string[] => [
	NATIONAL.id,
	...new Set(bundle.regions.map((region) => region.group)),
	...new Set(bundle.regions.map((region) => region.province))
];

// The mastery map colours coverages by element id, so a coverage without one would silently stay blank.
export function mapRules(bundle: Bundle, mapIds: readonly string[]): ContentMessage[] {
	const present = new Set(mapIds);
	return coverageIds(bundle)
		.filter((id) => !present.has(id))
		.map((id) => error("map-missing", `${id} has no map element`));
}
