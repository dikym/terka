import type { Bundle } from "../schema";

export function exclusiveProvinces(bundle: Pick<Bundle, "regions" | "areas">): Map<string, string> {
	const codesByArea = new Map<string, Set<string>>();
	for (const region of bundle.regions)
		for (const membership of region.areas) {
			const codes = codesByArea.get(membership.areaId) ?? new Set<string>();
			codes.add(region.id);
			codesByArea.set(membership.areaId, codes);
		}
	const result = new Map<string, string>();
	for (const region of bundle.regions) {
		const areas = bundle.areas.filter((area) => area.province === region.province);
		const exclusive =
			areas.length > 0 &&
			areas.every((area) => {
				const codes = codesByArea.get(area.id);
				return codes?.size === 1 && codes.has(region.id);
			});
		if (exclusive) result.set(region.id, region.province);
	}
	return result;
}
