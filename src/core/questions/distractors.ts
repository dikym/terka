import { areaDisplayName, highMembers } from "../answers/dictionary";
import type { Area, Bundle, Region, Special } from "../content/schema";
import { shuffle } from "../random";
import { compactName, holderKey } from "../text";

export type Scope = { level: "national" | "group" | "province"; id: string };
export const NATIONAL: Scope = { level: "national", id: "indonesia" };

export const inScope = (region: Region, scope: Scope) =>
	scope.level === "national" || region[scope.level] === scope.id;

export const eligibleRegions = (bundle: Pick<Bundle, "regions">) =>
	bundle.regions.filter(
		(region) =>
			region.confidence === "high" &&
			region.areas.some((membership) => membership.confidence === "high")
	);

// SRD 2.8: the scope first (the card's own group when its code is outside the scope), then the group, then national.
export function regionLayers(
	bundle: Pick<Bundle, "regions">,
	region: Region,
	scope: Scope
): Region[][] {
	const eligible = eligibleRegions(bundle);
	const group = eligible.filter((item) => item.group === region.group);
	return [
		inScope(region, scope) ? eligible.filter((item) => inScope(item, scope)) : group,
		group,
		eligible
	];
}

export function pickLayered<T>(
	layers: T[][],
	key: (item: T) => string,
	count: number,
	random: () => number
): T[] {
	const chosen = new Map<string, T>();
	for (const layer of layers)
		for (const item of shuffle(layer, random)) {
			if (chosen.size === count) return [...chosen.values()];
			if (!chosen.has(key(item))) chosen.set(key(item), item);
		}
	return [...chosen.values()];
}

// High areas of other codes that are not members of the asked code (shared areas never become distractors).
// SRD 2.8 "Nama sama, daerah beda": a same-named Kota/Kabupaten twin under another code grades
// correct too, so it is excluded by name (every membership of the asked code, any confidence),
// not just by area id.
export function foreignAreas(
	bundle: Pick<Bundle, "regions" | "areas">,
	region: Region,
	scope: Scope,
	count: number,
	random: () => number
): { owner: Region; area: Area }[] {
	const memberNames = new Set(
		region.areas
			.map((membership) => bundle.areas.find((item) => item.id === membership.areaId))
			.filter((area): area is Area => area !== undefined)
			.map((area) => compactName(area.name))
	);
	return pickLayered(
		regionLayers(bundle, region, scope).map((layer) =>
			layer.flatMap((owner) =>
				highMembers(bundle, owner)
					.filter((area) => !memberNames.has(compactName(area.name)))
					.map((area) => ({ owner, area }))
			)
		),
		({ area }) => areaDisplayName(area),
		count,
		random
	);
}

export function otherCodes(
	bundle: Pick<Bundle, "regions">,
	region: Region,
	scope: Scope,
	excludedIds: ReadonlySet<string>,
	count: number,
	random: () => number
): Region[] {
	return pickLayered(
		regionLayers(bundle, region, scope).map((layer) =>
			layer.filter((item) => !excludedIds.has(item.id))
		),
		(item) => item.code,
		count,
		random
	);
}

// SRD 2.9 "Pilihan dan pengecoh": only high CD entries, never an alias of the asked holder
// (in either direction), plus one n ± 1 neighbour for holder2special.
export function specialChoices(
	bundle: Pick<Bundle, "specials">,
	special: Special,
	mode: "special2holder" | "holder2special",
	count: number,
	random: () => number
): Special[] {
	const keys = new Set([special.holder, ...special.aliases].map(holderKey));
	const pool = bundle.specials.filter(
		(entry) =>
			entry.confidence === "high" &&
			!entry.needsReview &&
			entry.id !== special.id &&
			![entry.holder, ...entry.aliases].map(holderKey).some((key) => keys.has(key))
	);
	if (mode === "special2holder") {
		return shuffle(pool, random).slice(0, count);
	}
	const number = Number(special.number);
	const neighbour = shuffle(
		pool.filter((entry) => Math.abs(Number(entry.number) - number) === 1),
		random
	)[0];
	const rest = shuffle(
		pool.filter((entry) => entry !== neighbour),
		random
	).slice(0, neighbour ? count - 1 : count);
	return neighbour ? [neighbour, ...rest] : rest;
}
