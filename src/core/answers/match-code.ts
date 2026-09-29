import type { Bundle } from "../content/schema";

export type CodeMatch = { matchType: "exact" | "none"; confusedWith: string | null };

// SRD 5.1: codes compare upper case without spaces and never tolerate typos.
export function matchRegionCode(
	input: string,
	validCodeIds: readonly string[],
	bundle: Pick<Bundle, "regions">
): CodeMatch {
	const code = input.toUpperCase().replace(/\s+/g, "");
	const hit = bundle.regions.find((region) => region.code === code);
	if (!hit) return { matchType: "none", confusedWith: null };
	return validCodeIds.includes(hit.id)
		? { matchType: "exact", confusedWith: null }
		: { matchType: "none", confusedWith: hit.id };
}
