import type { Area, Bundle, Confidence, Region } from "../content/schema";

export type NameOwner = { codeId: string; confidence: Confidence };
export type NameEntry = {
	id: string;
	// A province or a code's own alias (Jogja, Lombok) is a wider name than an area.
	kind: "area" | "province" | "alias";
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

export function highMembers(bundle: Pick<Bundle, "areas">, region: Region): Area[] {
	return region.areas
		.filter((membership) => membership.confidence === "high")
		.map((membership) => {
			const area = bundle.areas.find((item) => item.id === membership.areaId);
			if (!area) throw new Error(`${region.id}: unknown area ${membership.areaId}`);
			return area;
		});
}

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
	// A province is a fair answer for every code whose own province it is, also when another code
	// shares it: Banten for A although B covers some of it, Sumatera Utara for both BK and BB.
	const provinceIds = new Set([
		...bundle.areas.map((area) => area.province),
		...bundle.regions.map((region) => region.province)
	]);
	const provinces: NameEntry[] = [...provinceIds].map((id) => ({
		id: `province:${id}`,
		kind: "province",
		areaType: null,
		canonical: provinceName(id),
		forms: [provinceName(id)],
		variants: [],
		owners: bundle.regions
			.filter((region) => region.province === id)
			.map((region) => ({ codeId: region.id, confidence: region.confidence }))
	}));
	const aliases: NameEntry[] = bundle.regions
		.filter((region) => region.aliases.length)
		.map((region) => ({
			id: `alias:${region.id}`,
			kind: "alias",
			areaType: null,
			canonical: region.aliases[0],
			forms: region.aliases,
			variants: [],
			owners: [{ codeId: region.id, confidence: region.confidence }]
		}));
	return {
		entries: [...areas, ...provinces, ...aliases],
		codeOrder: new Map(bundle.regions.map((region, index) => [region.id, index]))
	};
}
