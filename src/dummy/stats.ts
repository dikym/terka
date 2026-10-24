import type { GroupId } from "@/components/ui/groups";

export type CodeStatus = "learning" | "leech" | "suspended";

export const STATUS_LABEL: Record<CodeStatus, string> = {
	learning: "Sedang Dipelajari",
	leech: "Sulit Dikuasai",
	suspended: "Dinonaktifkan"
};

export const stats = {
	syncLabel: "Tersinkron 3 menit lalu",
	national: { percent: "26%", codes: "55 dari 212", groups: "1 dari 7" },
	levels: [
		{ level: "Level 1", name: "Kenali", passed: "153 soal lolos", percent: 72 },
		{ level: "Level 2", name: "Ingat", passed: "102 soal lolos", percent: 48 },
		{ level: "Level 3", name: "Kuasai", passed: "55 soal lolos", percent: 26 }
	],
	weakest: [
		{
			code: "BD",
			group: "sumatera",
			areas: "Bengkulu, Rejang Lebong, dan 8 lainnya",
			status: "learning",
			right: 5,
			of: 12
		},
		{
			code: "DP",
			group: "sulawesi",
			areas: "Parepare, Barru, Pinrang, dan 8 lainnya",
			status: "leech",
			right: 6,
			of: 13
		},
		{
			code: "BH",
			group: "sumatera",
			areas: "Jambi, Muaro Jambi, dan 9 lainnya",
			status: "learning",
			right: 7,
			of: 12
		},
		{
			code: "DH",
			group: "balinusra",
			areas: "Kupang, Timor Tengah Selatan, dan 4 lainnya",
			status: "learning",
			right: 8,
			of: 13
		},
		{
			code: "AD",
			group: "jawa",
			areas: "Surakarta, Sukoharjo, dan 5 lainnya",
			status: "learning",
			right: 9,
			of: 14
		}
	] satisfies {
		code: string;
		group: GroupId;
		areas: string;
		status: CodeStatus;
		right: number;
		of: number;
	}[],
	forecast: {
		title: "Puncak 22 soal pada Senin, 5 Oktober",
		threshold: 40,
		days: [
			["Hari", "ini", 12],
			["Sen", "28", 9],
			["Sel", "29", 14],
			["Rab", "30", 7],
			["Kam", "1", 18],
			["Jum", "2", 11],
			["Sab", "3", 6],
			["Min", "4", 15],
			["Sen", "5", 22],
			["Sel", "6", 8],
			["Rab", "7", 10],
			["Kam", "8", 13],
			["Jum", "9", 9],
			["Sab", "10", 17]
		] as [string, string, number][]
	},
	byGroup: [
		{ group: "sumatera", name: "Sumatera", levels: ["30%", "12%", "4%"] },
		{ group: "jawa", name: "Jawa", levels: ["46%", "30%", "14%"] },
		{ group: "kalimantan", name: "Kalimantan", levels: ["40%", "22%", "10%"] },
		{ group: "sulawesi", name: "Sulawesi", levels: ["24%", "9%", "2%"] },
		{ group: "balinusra", name: "Bali & Nusa Tenggara", levels: ["92%", "78%", "58%"] },
		{ group: "maluku", name: "Maluku", levels: ["100%", "100%", "100%"] },
		{ group: "papua", name: "Papua", levels: ["12%", "0%", "0%"] }
	] satisfies { group: GroupId; name: string; levels: string[] }[],
	hard: [
		{ code: "DP", group: "sulawesi", status: "suspended" },
		{ code: "DT", group: "sulawesi", status: "leech" },
		{ code: "BN", group: "sumatera", status: "leech" }
	] satisfies { code: string; group: GroupId; status: CodeStatus }[],
	nameAll: [
		{
			code: "BK",
			group: "sumatera",
			title: "Sebutkan daerah BK",
			areas: "15 kab/kota",
			wait: null
		},
		{
			code: "D",
			group: "jawa",
			title: "Sebutkan daerah D",
			areas: "5 kab/kota",
			wait: "3 hari lagi"
		}
	] satisfies {
		code: string;
		group: GroupId;
		title: string;
		areas: string;
		wait: string | null;
	}[],
	diplomat: { mastered: 42, total: 130 },
	seen: [
		{ code: "BK", group: "sumatera", count: 9 },
		{ code: "B", group: "jawa", count: 6 },
		{ code: "AB", group: "jawa", count: 4 },
		{ code: "DK", group: "balinusra", count: 3 },
		{ code: "BA", group: "sumatera", count: 2 }
	] satisfies { code: string; group: GroupId; count: number }[],
	account: {
		email: "rani@email.com",
		sync: "Tersinkron 3 menit lalu",
		export: "Ekspor terakhir 12 hari lalu"
	}
};

export type Stats = typeof stats;

export const masteryByGroup = [
	{
		group: "balinusra",
		name: "Bali & Nusa Tenggara",
		percent: 64,
		figures: [
			["100%", "Bali"],
			["60%", "NTB"],
			["38%", "NTT"]
		],
		note: { tone: "text-stop-700", text: "1 pasangan sering tertukar: DR dan DH" }
	},
	{
		group: "maluku",
		name: "Maluku",
		percent: 100,
		figures: [
			["100%", "Maluku"],
			["100%", "Maluku Utara"]
		],
		note: { tone: "text-go-700", text: "Kawasan dikuasai" }
	},
	{
		group: "jawa",
		name: "Jawa",
		percent: 22,
		figures: [
			["80%", "tertinggi DKI Jakarta"],
			["10%", "terendah Jawa Timur"]
		]
	},
	{
		group: "kalimantan",
		name: "Kalimantan",
		percent: 14,
		figures: [
			["30%", "tertinggi Kalimantan Selatan"],
			["2 provinsi", "belum mulai"]
		]
	},
	{
		group: "sumatera",
		name: "Sumatera",
		percent: 8,
		figures: [
			["25%", "tertinggi Bengkulu"],
			["4 provinsi", "belum mulai"]
		]
	},
	{
		group: "sulawesi",
		name: "Sulawesi",
		percent: 4,
		figures: [
			["1 provinsi", "sudah mulai"],
			["5 provinsi", "belum mulai"]
		]
	},
	{
		group: "papua",
		name: "Papua",
		percent: 0,
		figures: [
			["2 provinsi", "belum mulai"],
			["4 provinsi", "belum ada materi"]
		],
		note: { tone: "text-caution-700", text: "Data belum terverifikasi penuh" }
	}
] satisfies {
	group: GroupId;
	name: string;
	percent: number;
	figures: string[][];
	note?: { tone: string; text: string };
}[];

export type HardCard = {
	code: string;
	group: GroupId;
	form: string;
	place: string;
	misses: number;
	status: "leech" | "suspended";
	areas: string[];
	more: number;
};

export const hardCards: HardCard[] = [
	{
		code: "BD",
		group: "sumatera",
		form: "Tebak daerah",
		place: "Bengkulu",
		misses: 6,
		status: "leech",
		areas: [
			"Kota Bengkulu",
			"Kabupaten Rejang Lebong",
			"Kabupaten Kepahiang",
			"Kabupaten Lebong"
		],
		more: 6
	},
	{
		code: "DL",
		group: "sulawesi",
		form: "Tebak kode",
		place: "Sulawesi Utara",
		misses: 7,
		status: "leech",
		areas: [
			"Kota Bitung",
			"Kabupaten Minahasa Utara",
			"Kabupaten Kepulauan Sangihe",
			"Kabupaten Kepulauan Talaud"
		],
		more: 2
	},
	{
		code: "DN",
		group: "sulawesi",
		form: "Tebak daerah",
		place: "Sulawesi Tengah",
		misses: 8,
		status: "suspended",
		areas: ["Kota Palu", "Kabupaten Donggala", "Kabupaten Poso", "Kabupaten Sigi"],
		more: 9
	},
	{
		code: "DC",
		group: "sulawesi",
		form: "Tebak kode",
		place: "Sulawesi Barat",
		misses: 8,
		status: "suspended",
		areas: [
			"Kabupaten Mamuju",
			"Kabupaten Majene",
			"Kabupaten Polewali Mandar",
			"Kabupaten Mamasa"
		],
		more: 2
	}
];

export const accountPage = {
	email: "rani@email.com",
	provider: "Masuk dengan Google",
	pending: "12 perubahan menunggu sinkronisasi",
	pendingNote: "dikirim beberapa detik lagi",
	synced: "Tersinkron 3 menit lalu",
	devices: "3 perangkat",
	lastExport: "Ekspor terakhir 34 hari lalu",
	imported: "320 jawaban ditambahkan, 1.240 sudah ada."
};
