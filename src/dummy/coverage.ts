import type { GroupId } from "@/components/ui/groups";

export type Province = { id: string; name: string; codes: string[]; percent: number };

export type CoverageGroup = {
	id: GroupId;
	codes: number;
	percent: number;
	newAvailable: number;
	provinces: Province[];
};

export const NATIONAL = { provinces: 38, codes: 61, percent: 26, newAvailable: 34 };

export const ACTIVE_SCOPE: GroupId = "balinusra";

export const COVERAGE: CoverageGroup[] = [
	{
		id: "sumatera",
		codes: 11,
		percent: 8,
		newAvailable: 8,
		provinces: [
			{ id: "aceh", name: "Aceh", codes: ["BL"], percent: 0 },
			{ id: "sumatera-utara", name: "Sumatera Utara", codes: ["BK", "BB"], percent: 12 },
			{ id: "sumatera-barat", name: "Sumatera Barat", codes: ["BA"], percent: 20 },
			{ id: "riau", name: "Riau", codes: ["BM"], percent: 0 },
			{ id: "kepulauan-riau", name: "Kepulauan Riau", codes: ["BP"], percent: 0 },
			{ id: "jambi", name: "Jambi", codes: ["BH"], percent: 15 },
			{ id: "bengkulu", name: "Bengkulu", codes: ["BD"], percent: 25 },
			{ id: "sumatera-selatan", name: "Sumatera Selatan", codes: ["BG"], percent: 10 },
			{
				id: "kepulauan-bangka-belitung",
				name: "Kep. Bangka Belitung",
				codes: ["BN"],
				percent: 0
			},
			{ id: "lampung", name: "Lampung", codes: ["BE"], percent: 5 }
		]
	},
	{
		id: "jawa",
		codes: 22,
		percent: 22,
		newAvailable: 14,
		provinces: [
			{ id: "banten", name: "Banten", codes: ["A"], percent: 50 },
			{ id: "jakarta", name: "DKI Jakarta", codes: ["B"], percent: 100 },
			{ id: "jawa-barat", name: "Jawa Barat", codes: ["D", "E", "F", "T", "Z"], percent: 30 },
			{
				id: "jawa-tengah",
				name: "Jawa Tengah",
				codes: ["G", "H", "K", "R", "AA", "AD"],
				percent: 15
			},
			{ id: "yogyakarta", name: "Yogyakarta", codes: ["AB"], percent: 40 },
			{
				id: "jawa-timur",
				name: "Jawa Timur",
				codes: ["L", "M", "N", "P", "S", "W", "AE", "AG"],
				percent: 8
			}
		]
	},
	{
		id: "kalimantan",
		codes: 5,
		percent: 14,
		newAvailable: 4,
		provinces: [
			{ id: "kalimantan-barat", name: "Kalimantan Barat", codes: ["KB"], percent: 20 },
			{ id: "kalimantan-tengah", name: "Kalimantan Tengah", codes: ["KH"], percent: 0 },
			{ id: "kalimantan-selatan", name: "Kalimantan Selatan", codes: ["DA"], percent: 30 },
			{ id: "kalimantan-timur", name: "Kalimantan Timur", codes: ["KT"], percent: 15 },
			{ id: "kalimantan-utara", name: "Kalimantan Utara", codes: ["KU"], percent: 0 }
		]
	},
	{
		id: "sulawesi",
		codes: 9,
		percent: 4,
		newAvailable: 8,
		provinces: [
			{ id: "sulawesi-utara", name: "Sulawesi Utara", codes: ["DB", "DL"], percent: 0 },
			{ id: "gorontalo", name: "Gorontalo", codes: ["DM"], percent: 0 },
			{ id: "sulawesi-tengah", name: "Sulawesi Tengah", codes: ["DN"], percent: 0 },
			{ id: "sulawesi-barat", name: "Sulawesi Barat", codes: ["DC"], percent: 0 },
			{
				id: "sulawesi-selatan",
				name: "Sulawesi Selatan",
				codes: ["DD", "DP", "DW"],
				percent: 10
			},
			{ id: "sulawesi-tenggara", name: "Sulawesi Tenggara", codes: ["DT"], percent: 0 }
		]
	},
	{
		id: "balinusra",
		codes: 6,
		percent: 64,
		newAvailable: 2,
		provinces: [
			{ id: "bali", name: "Bali", codes: ["DK"], percent: 100 },
			{
				id: "nusa-tenggara-barat",
				name: "Nusa Tenggara Barat",
				codes: ["DR", "EA"],
				percent: 60
			},
			{
				id: "nusa-tenggara-timur",
				name: "Nusa Tenggara Timur",
				codes: ["DH", "EB", "ED"],
				percent: 38
			}
		]
	},
	{
		id: "maluku",
		codes: 2,
		percent: 100,
		newAvailable: 0,
		provinces: [
			{ id: "maluku-utara", name: "Maluku Utara", codes: ["DG"], percent: 100 },
			{ id: "maluku", name: "Maluku", codes: ["DE"], percent: 100 }
		]
	},
	{
		id: "papua",
		codes: 6,
		percent: 0,
		newAvailable: 6,
		provinces: [
			{ id: "papua-barat-daya", name: "Papua Barat Daya", codes: ["PY"], percent: 0 },
			{ id: "papua-barat", name: "Papua Barat", codes: ["PB"], percent: 0 },
			{ id: "papua", name: "Papua", codes: ["PA"], percent: 0 },
			{ id: "papua-tengah", name: "Papua Tengah", codes: ["PT"], percent: 0 },
			{ id: "papua-pegunungan", name: "Papua Pegunungan", codes: ["PG"], percent: 0 },
			{ id: "papua-selatan", name: "Papua Selatan", codes: ["PS"], percent: 0 }
		]
	}
];

export const groupOf = (id: GroupId) => COVERAGE.find((group) => group.id === id)!;

export const FRONT_CODES = COVERAGE.flatMap((group) =>
	group.provinces.flatMap((province) => province.codes)
);
