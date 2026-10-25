import type { GroupId } from "@/components/ui/groups";
import type { FlagCode } from "@/components/ui/icon";
import { areaDisplayName, provinceName } from "@/core/answers/dictionary";
import type { Bundle, Region, Special } from "@/core/content/schema";
import { frontCode } from "@/core/reference/front-code";
import { searchReference } from "@/core/reference/search";
import { specialCodeList } from "@/core/reference/specials";
import type { AppState } from "@/core/replay/state";
import { sightingCounts } from "@/core/views/stats";
import { SIGHTING_WINDOW_DAYS } from "@/rules";
import { holderFlag } from "./flags";
import { shortDate } from "./format";
import { provincesOf, uiGroup } from "./groups";
import { areaSummary } from "./stats";

export type RefView =
	| { kind: "list" }
	| { kind: "suggest"; query: string }
	| { kind: "region"; code: string }
	| { kind: "special"; number: string }
	| { kind: "cc" }
	| { kind: "ri" }
	| { kind: "none"; query: string };

export type Area = { name: string; unverified?: boolean };

export type RegionDetail = {
	code: string;
	group: GroupId;
	province: string;
	kota: Area[];
	kabupaten: Area[];
	verified: boolean;
	seen?: string;
	note?: string;
};

export type DiplomatEntry = {
	number: string;
	name: string;
	flag?: FlagCode;
	type: "negara" | "organisasi";
	alias: string;
	source: string;
	checked: string | null;
};

export type Suggestions = {
	diplomats: DiplomatEntry[];
	diplomatTotal: number;
	regions: { code: string; group: GroupId; areas: string; province: string }[];
};

const CD_PREFIX = /^\s*cd[\s.-]*0*(\d{0,3})\s*$/i;
const byNumber = (a: Special, b: Special) => Number(a.number) - Number(b.number);
const startingWith = (bundle: Bundle, digits: string) =>
	bundle.specials.filter((special) => special.number.startsWith(digits)).sort(byNumber);

export function refView(bundle: Bundle, raw: string): RefView {
	const result = searchReference(bundle, raw);
	const query = raw.trim();
	switch (result.kind) {
		case "empty":
			return { kind: "list" };
		case "region":
			return { kind: "region", code: result.region.code };
		case "special":
			return { kind: "special", number: result.special.number };
		case "reference":
			return result.plate.series === "RI" ? { kind: "ri" } : { kind: "cc" };
		case "specialList":
		case "names":
			return { kind: "suggest", query };
		case "none": {
			// "CD 4" is the start of a number, not a missing one.
			const digits = query.match(CD_PREFIX)?.[1];
			const partial =
				digits !== undefined &&
				startingWith(bundle, digits).some((special) => special.number !== digits);
			return partial ? { kind: "suggest", query } : { kind: "none", query };
		}
	}
}

export function diplomatEntry(bundle: Bundle, special: Special): DiplomatEntry {
	const sources = bundle.sources.filter((source) => special.sources.includes(source.id));
	const checked = sources.map((source) => source.checkedAt).find((date) => date !== null);
	return {
		number: special.number,
		name: special.holder,
		flag: holderFlag(special),
		type: special.holderType === "country" ? "negara" : "organisasi",
		alias: special.aliases.join(", ") || "–",
		source: sources[0]?.title ?? "Lampiran Perpol 7/2021",
		checked: checked ? shortDate(checked) : null
	};
}

const regionRow = (bundle: Bundle, region: Region) => ({
	code: region.code,
	group: uiGroup(region.group),
	areas: areaSummary(bundle, region, 3),
	province: provinceName(region.province)
});

export function suggestions(bundle: Bundle, raw: string): Suggestions {
	const digits = raw.match(CD_PREFIX)?.[1];
	if (digits !== undefined) {
		const all = startingWith(bundle, digits);
		return {
			diplomats: all.map((special) => diplomatEntry(bundle, special)),
			diplomatTotal: all.length,
			regions: []
		};
	}
	const result = searchReference(bundle, raw);
	if (result.kind !== "names") return { diplomats: [], diplomatTotal: 0, regions: [] };
	const specials = [...result.specials].sort(byNumber);
	return {
		diplomats: specials.map((special) => diplomatEntry(bundle, special)),
		diplomatTotal: specials.length,
		regions: result.regions.map(({ region, areas }) =>
			// Found through its areas: name those, so the row says why it is listed.
			areas.length
				? { ...regionRow(bundle, region), areas: areas.map(areaDisplayName).join(", ") }
				: regionRow(bundle, region)
		)
	};
}

export function regionDetail(
	bundle: Bundle,
	state: AppState,
	code: string,
	today: string
): RegionDetail {
	const region = bundle.regions.find((item) => item.code === code);
	if (!region) throw new Error(`unknown code ${code}`);
	const kota: Area[] = [];
	const kabupaten: Area[] = [];
	for (const membership of region.areas) {
		const area = bundle.areas.find((item) => item.id === membership.areaId);
		if (!area) continue;
		const entry =
			membership.confidence === "high"
				? { name: area.name }
				: { name: area.name, unverified: true };
		(area.type === "kota" ? kota : kabupaten).push(entry);
	}
	const seen = sightingCounts(state, today).get(region.id);
	return {
		code: region.code,
		group: uiGroup(region.group),
		province: provinceName(region.province),
		kota,
		kabupaten,
		verified: region.confidence === "high",
		...(seen ? { seen: `${seen} kali dalam ${SIGHTING_WINDOW_DAYS} hari` } : {})
	};
}

/** Other front codes of the same province, for "Kode lain di …". */
export function otherCodes(bundle: Bundle, code: string): string[] {
	const region = bundle.regions.find((item) => item.code === code);
	if (!region) return [];
	return bundle.regions
		.filter((item) => item.province === region.province && item.code !== code)
		.map((item) => item.code);
}

export type RefGroup = {
	id: GroupId;
	codes: number;
	provinces: { id: string; name: string; codes: string[] }[];
};

/** Groups and provinces for the Referensi list; a code that spans provinces shows under each. */
export function refGroups(bundle: Bundle): RefGroup[] {
	return bundle.groups.map((group) => ({
		id: uiGroup(group.id),
		codes: bundle.regions.filter((region) => region.group === group.id).length,
		provinces: provincesOf(bundle, group.id).map((province) => ({
			...province,
			codes: [
				...province.codes,
				...bundle.regions
					.filter((region) => region.spans.includes(province.id))
					.map((region) => region.code)
					.filter((code) => !province.codes.includes(code))
			]
		}))
	}));
}

/** Codes not verified enough to be practised; drawn on a yellow wash. */
export const unverifiedCodes = (bundle: Bundle) =>
	new Set(bundle.regions.filter((region) => region.confidence !== "high").map((r) => r.code));

/** Every diplomat code in number order. */
export function diplomatList(bundle: Bundle) {
	const { entries, first, last } = specialCodeList(bundle);
	return {
		entries: entries.map((special) => diplomatEntry(bundle, special)),
		summary: { entries: entries.length, first: `CD ${first}`, last: `CD ${last}` }
	};
}

/** The front code a sighting would be stored under, or null when the query is not one. */
export const sightingCode = (bundle: Bundle, query: string) => {
	const code = frontCode(query);
	return code && bundle.regions.some((region) => region.code === code) ? code : null;
};
