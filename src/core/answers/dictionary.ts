import { exclusiveProvinces } from "../content/rules/provinces";
import type { Area, Bundle, Confidence, Region } from "../content/schema";

export type NameOwner = { codeId: string; confidence: Confidence };
export type NameEntry = {
	id: string;
	kind: "area" | "province";
	areaType: Area["type"] | null;
	canonical: string;
	forms: string[];
	variants: string[];
	owners: NameOwner[];
};
export type NameDictionary = { entries: NameEntry[]; codeOrder: Map<string, number> };

export const areaDisplayName = (area: Pick<Area, "type" | "name">) =>
	`${area.type === "kota" ? "Kota" : "Kabupaten"} ${area.name}`;

// plates.json has no province names; ids are full lower-case names ("kepulauan-bangka-belitung").
export const provinceName = (id: string) =>
	id
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");

// Only high memberships are asked, accepted or used as distractors (SRD 5.1, TRD 4.1).
export function highMembers(bundle: Pick<Bundle, "areas">, region: Region): Area[] {
	return region.areas
		.filter((membership) => membership.confidence === "high")
		.map((membership) => {
			const area = bundle.areas.find((item) => item.id === membership.areaId);
			if (!area) throw new Error(`${region.id}: unknown area ${membership.areaId}`);
			return area;
		});
}

// SRD 5.1 "Kamus": every area of every code plus province names; region labels are not answers.
export function buildDictionary(bundle: Pick<Bundle, "regions" | "areas">): NameDictionary {
	const owners = new Map<string, NameOwner[]>();
	for (const region of bundle.regions)
		for (const membership of region.areas)
			owners.set(membership.areaId, [
				...(owners.get(membership.areaId) ?? []),
				{ codeId: region.id, confidence: membership.confidence }
			]);
	const areas: NameEntry[] = bundle.areas.map((area) => ({
		id: area.id,
		kind: "area",
		areaType: area.type,
		canonical: areaDisplayName(area),
		forms: [area.name, areaDisplayName(area), ...area.aliases],
		variants: area.variants,
		owners: owners.get(area.id) ?? []
	}));
	const exclusive = [...exclusiveProvinces(bundle)];
	const provinces: NameEntry[] = [...new Set(bundle.areas.map((area) => area.province))].map(
		(id) => ({
			id: `province:${id}`,
			kind: "province",
			areaType: null,
			canonical: provinceName(id),
			forms: [provinceName(id)],
			variants: [],
			owners: exclusive
				.filter(([, province]) => province === id)
				.map(([codeId]) => ({ codeId, confidence: "high" as const }))
		})
	);
	return {
		entries: [...areas, ...provinces],
		codeOrder: new Map(bundle.regions.map((region, index) => [region.id, index]))
	};
}
