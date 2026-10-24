import type { GroupId } from "@/components/ui/groups";
import type { FlagCode } from "@/components/ui/icon";
import { COVERAGE, FRONT_CODES } from "./coverage";

export type RefView =
	| { kind: "list" }
	| { kind: "suggest"; query: string }
	| { kind: "region"; code: string }
	| { kind: "special"; number: string }
	| { kind: "cc" }
	| { kind: "ri" }
	| { kind: "none"; query: string };

/** Codes still waiting for full verification; drawn on a yellow wash. */
export const UNVERIFIED = new Set(["EA", "EB", "ED", "PY", "PA", "PT", "PG", "PS"]);

// Referensi lists B under Banten and Jawa Barat as well as Jakarta.
const EXTRA_CODES: Record<string, string[]> = { banten: ["B"], "jawa-barat": ["B"] };

export const REF_GROUPS = COVERAGE.map((group) => ({
	id: group.id,
	codes: group.codes,
	provinces: group.provinces.map((province) => ({
		...province,
		codes: [...province.codes, ...(EXTRA_CODES[province.id] ?? [])]
	}))
}));

export type Area = { name: string; unverified?: boolean };

export type RegionDetail = {
	code: string;
	group: GroupId;
	province: string;
	kota: Area[];
	kabupaten: Area[];
	note?: string;
	seen?: string;
	nearby?: { codes: string[]; note: string };
};

const names = (list: string) => list.split(", ").map((name) => ({ name }));

export const REGION_DETAILS: Record<string, RegionDetail> = {
	BK: {
		code: "BK",
		group: "sumatera",
		province: "Sumatera Utara",
		kota: names("Medan, Binjai, Tebing Tinggi, Pematangsiantar, Tanjungbalai"),
		kabupaten: names(
			"Deli Serdang, Langkat, Karo, Serdang Bedagai, Simalungun, Asahan, Batu Bara, Labuhanbatu, Labuhanbatu Utara, Labuhanbatu Selatan"
		),
		note: "Nama provinsi tidak diterima sebagai jawaban karena Sumatera Utara juga memakai BB.",
		seen: "9 kali dalam 30 hari",
		nearby: { codes: ["BL", "BA", "BM"], note: "Kode lain di Kawasan Sumatera bagian utara." }
	},
	BB: {
		code: "BB",
		group: "sumatera",
		province: "Sumatera Utara",
		kota: names("Sibolga, Padangsidimpuan, Gunungsitoli"),
		kabupaten: [
			...names(
				"Tapanuli Utara, Tapanuli Tengah, Tapanuli Selatan, Toba, Samosir, Humbang Hasundutan, Dairi, Pakpak Bharat, Mandailing Natal, Padang Lawas, Padang Lawas Utara, Nias, Nias Selatan, Nias Utara"
			),
			{ name: "Nias Barat", unverified: true }
		]
	},
	DD: {
		code: "DD",
		group: "sulawesi",
		province: "Sulawesi Selatan",
		kota: names("Makassar"),
		kabupaten: names("Gowa, Maros, Takalar, Jeneponto, Bantaeng, Bulukumba, Kepulauan Selayar")
	}
};

/** Detail for any front code; codes without dummy areas still get their province. */
export function regionDetail(code: string): RegionDetail {
	const known = REGION_DETAILS[code];
	if (known) return known;
	for (const group of REF_GROUPS)
		for (const province of group.provinces)
			if (province.codes.includes(code))
				return { code, group: group.id, province: province.name, kota: [], kabupaten: [] };
	throw new Error(`unknown code ${code}`);
}

export const otherCodes = (detail: RegionDetail) =>
	REF_GROUPS.flatMap((group) => group.provinces)
		.filter((province) => province.name === detail.province)
		.flatMap((province) => province.codes)
		.filter((code) => code !== detail.code);

export type Diplomat = {
	number: string;
	name: string;
	flag: FlagCode;
	type: "negara" | "organisasi";
	alias: string;
};

export const DIPLOMATS: Diplomat[] = [
	{ number: "45", name: "Iran", flag: "ir", type: "negara", alias: "Iran" },
	{ number: "47", name: "Malaysia", flag: "my", type: "negara", alias: "Malaysia" },
	{ number: "48", name: "Turki", flag: "tr", type: "negara", alias: "Türkiye" },
	{ number: "49", name: "Jepang", flag: "jp", type: "negara", alias: "Japan" },
	{ number: "50", name: "Bulgaria", flag: "bg", type: "negara", alias: "Bulgaria" },
	{ number: "51", name: "Kamboja", flag: "kh", type: "negara", alias: "Cambodia" },
	{
		number: "58",
		name: "UNDP",
		flag: "un",
		type: "organisasi",
		alias: "United Nations Development Programme"
	}
];

export const DIPLOMAT_SUMMARY = { entries: 130, first: "CD 12", last: "CD 145" };

// The full list has ten numbers starting with 4; the dummy list carries four of them.
export const DIPLOMAT_TOTALS: Record<string, number> = { "4": 10 };

const CD = /^CD\s*0*(\d{0,3})(.*)$/;
const words = (text: string) => text.toLowerCase().split(/[\s,]+/);

function nameMatches(query: string) {
	const q = query.toLowerCase();
	const hit = (text: string) => words(text).some((word) => word.startsWith(q));
	return REF_GROUPS.flatMap((group) => group.provinces).filter(
		(province) =>
			hit(province.name) ||
			province.codes.some((code) =>
				REGION_DETAILS[code]?.kota.some((area) => hit(area.name))
			) ||
			province.codes.some((code) =>
				REGION_DETAILS[code]?.kabupaten.some((area) => hit(area.name))
			)
	);
}

export const groupMatches = (query: string) =>
	query.length >= 3 ? REF_GROUPS.filter((group) => group.id.startsWith(query.toLowerCase())) : [];

export function searchDummy(raw: string): RefView {
	const query = raw.trim();
	if (!query) return { kind: "list" };
	const upper = query.toUpperCase().replace(/\s+/g, " ");
	const cd = upper.match(CD);
	if (cd) {
		const [, number, rest] = cd;
		if (DIPLOMATS.some((entry) => entry.number === number)) return { kind: "special", number };
		const partial = !rest.trim() && DIPLOMATS.some((entry) => entry.number.startsWith(number));
		return partial ? { kind: "suggest", query } : { kind: "none", query };
	}
	if (/^C[CH]\b/.test(upper)) return { kind: "cc" };
	if (/^RI\b/.test(upper)) return { kind: "ri" };
	const code = upper.replace(/\s/g, "");
	if (FRONT_CODES.includes(code)) return { kind: "region", code };
	const front = upper.match(/^([A-Z]{1,2}) \d/)?.[1];
	if (front && FRONT_CODES.includes(front)) return { kind: "region", code: front };
	if (query.length >= 3 && (nameMatches(query).length || groupMatches(query).length))
		return { kind: "suggest", query };
	return { kind: "none", query };
}

export type Suggestions = {
	diplomats: Diplomat[];
	diplomatTotal: number;
	regions: { code: string; group: GroupId; areas: string; province: string }[];
};

const areaSummary = (detail: RegionDetail) => {
	const all = [...detail.kota, ...detail.kabupaten].map((area) => area.name);
	if (!all.length) return detail.province;
	return all.length > 3
		? `${all.slice(0, 3).join(", ")}, dan ${all.length - 3} lainnya`
		: all.join(", ");
};

export function suggestions(raw: string): Suggestions {
	const upper = raw.trim().toUpperCase().replace(/\s+/g, " ");
	const cd = upper.match(CD);
	if (cd) {
		const number = cd[1];
		const diplomats = DIPLOMATS.filter((entry) => entry.number.startsWith(number)).slice(0, 4);
		const detail = REGION_DETAILS.DD;
		return {
			diplomats,
			diplomatTotal: DIPLOMAT_TOTALS[number] ?? diplomats.length,
			// A front code hit is listed alongside diplomat hits, as the dummy data expects.
			regions: [
				{
					code: "DD",
					group: detail.group,
					areas: areaSummary(detail),
					province: detail.province
				}
			]
		};
	}
	const provinces = [
		...nameMatches(raw.trim()),
		...groupMatches(raw.trim()).flatMap((group) => group.provinces)
	];
	const regions = [...new Set(provinces.flatMap((province) => province.codes))].map((code) => {
		const detail = regionDetail(code);
		return { code, group: detail.group, areas: areaSummary(detail), province: detail.province };
	});
	return { diplomats: [], diplomatTotal: 0, regions: regions.slice(0, 6) };
}
