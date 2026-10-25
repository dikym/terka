import type {
	Area,
	Bundle,
	Confidence,
	ContentSource,
	ReferencePlate,
	Region,
	Special
} from "../content/schema";
import { provinceName } from "../answers/dictionary";
import { groupName } from "../content/names";
import { compactName, holderKey, normalizeName } from "../text";
import { frontCode } from "./front-code";

export type ReferenceResult =
	| { kind: "empty" }
	| { kind: "none"; query: string }
	| {
			kind: "region";
			region: Region;
			areas: { area: Area; confidence: Confidence }[];
			trainable: boolean;
	  }
	| { kind: "special"; special: Special; sources: ContentSource[] }
	| { kind: "reference"; plate: ReferencePlate }
	| { kind: "specialList" }
	| {
			kind: "names";
			regions: { region: Region; areas: Area[]; via: NameMatch | null }[];
			specials: Special[];
	  };

/** Which of a region's own names the query matched; null when only its areas did. */
export type NameMatch = { kind: "province" | "group" | "region"; name: string };

const CD_NUMBER = /^\s*cd[\s.-]*0*(\d{1,3})/i;

const startsWord = (form: string, query: string) => ` ${form}`.includes(` ${query}`);

function byCode(bundle: Bundle, query: string, code: string): ReferenceResult {
	if (code === "CD") {
		const number = query.match(CD_NUMBER)?.[1];
		if (!number) return { kind: "specialList" };
		const special = bundle.specials.find((entry) => entry.number === number);
		if (!special) return { kind: "none", query };
		const sources = bundle.sources.filter((source) => special.sources.includes(source.id));
		return { kind: "special", special, sources };
	}
	const plate = bundle.referencePlates.find((entry) => entry.series === code);
	if (plate) return { kind: "reference", plate };
	const region = bundle.regions.find((entry) => entry.code === code);
	if (!region) return { kind: "none", query };
	const areas = region.areas.flatMap((membership) => {
		const area = bundle.areas.find((item) => item.id === membership.areaId);
		return area ? [{ area, confidence: membership.confidence }] : [];
	});
	return { kind: "region", region, areas, trainable: region.confidence === "high" };
}

function byName(bundle: Bundle, query: string): ReferenceResult {
	const name = normalizeName(query);
	const compact = compactName(query);
	const holder = holderKey(query);
	const areaMatches = (area: Area) =>
		[area.name, ...area.aliases, ...area.variants].some(
			(form) => startsWord(normalizeName(form), name) || compactName(form) === compact
		);
	const regions = bundle.regions.flatMap((region) => {
		const areas = region.areas
			.map((membership) => bundle.areas.find((item) => item.id === membership.areaId))
			.filter((area): area is Area => area !== undefined && areaMatches(area));
		// A province name ("Jawa Timur") finds every code inside it. A group opens only when its
		// whole name is typed ("Jawa"), so "bali" does not list all of Bali & Nusa Tenggara.
		const province = provinceName(region.province);
		const group = groupName(bundle, region.group);
		const via: NameMatch | null = startsWord(normalizeName(province), name)
			? { kind: "province", name: province }
			: normalizeName(group) === name
				? { kind: "group", name: group }
				: startsWord(normalizeName(region.region), name)
					? { kind: "region", name: region.region }
					: null;
		return areas.length > 0 || via ? [{ region, areas, via }] : [];
	});
	const specials = bundle.specials.filter((special) =>
		[special.holder, ...special.aliases].some((form) => holderKey(form).startsWith(holder))
	);
	return regions.length > 0 || specials.length > 0
		? { kind: "names", regions, specials }
		: { kind: "none", query };
}

// Referensi shows content only; whether a search counts as a sighting is decided by sightingEvent.
export function searchReference(bundle: Bundle, query: string): ReferenceResult {
	if (normalizeName(query, false) === "") return { kind: "empty" };
	const code = frontCode(query);
	if (code) return byCode(bundle, query, code);
	if (normalizeName(query) === "") return { kind: "none", query };
	return byName(bundle, query);
}
