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

// Scope first (the card's own group when its code is outside the scope), then group, then national.
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

// Excludes every name the asked code uses: a same-named twin under another code grades correct.
export function foreignAreas(
	bundle: Pick<Bundle, "regions" | "areas">,
	region: Region,
	scope: Scope,
	count: number,
	random: () => number,
	options: { preferOtherProvince?: boolean } = {}
): { owner: Region; area: Area }[] {
	const memberNames = new Set(
		region.areas
			.map((membership) => bundle.areas.find((item) => item.id === membership.areaId))
			.filter((area): area is Area => area !== undefined)
			.map((area) => compactName(area.name))
	);
	const layers = regionLayers(bundle, region, scope).map((layer) =>
		layer.flatMap((owner) =>
			highMembers(bundle, owner)
				.filter((area) => !memberNames.has(compactName(area.name)))
				.map((area) => ({ owner, area }))
		)
	);
	const split = options.preferOtherProvince
		? layers.flatMap((layer) => [
				layer.filter(({ owner }) => owner.province !== region.province),
				layer.filter(({ owner }) => owner.province === region.province)
			])
		: layers;
	return pickLayered(split, ({ area }) => areaDisplayName(area), count, random);
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
