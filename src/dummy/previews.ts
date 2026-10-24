import type { GroupId } from "@/components/ui/groups";
import type { IconName } from "@/components/ui/icon";
import type { Mode } from "./session";

export type Preview = {
	icon: IconName;
	title: string;
	scope?: { group: GroupId | "national"; label: string };
	facts?: [IconName, string][];
	description?: string;
	count: string;
	unit: string;
	aside: { label: string; icon: IconName; value: string };
	composition?: [string, number, string][];
	types: [string, string][];
	right:
		| { kind: "levels"; values: [number, number, number] }
		| { kind: "streak"; days: number; note: string }
		| { kind: "rules"; rows: [string, string][] };
	notes?: [IconName, string | null, string][];
	start: string;
};

const SCHEDULE: [IconName, string, string] = [
	"layers",
	"5",
	" soal dari luar Cakupan karena sudah waktunya diulang."
];

export const PREVIEWS: Record<Mode, Preview> = {
	hariIni: {
		icon: "play",
		title: "Sesi hari ini",
		scope: { group: "balinusra", label: "Kawasan Bali & Nusa Tenggara" },
		count: "18",
		unit: "soal",
		aside: { label: "Perkiraan durasi", icon: "clock", value: "Sekitar 6–9 menit waktu aktif" },
		composition: [
			["Pengulangan", 12, "bg-ink-1000"],
			["Materi baru", 4, "bg-caution-500"],
			["Bandingkan Kode", 2, "bg-tangerine-500"]
		],
		types: [
			["Tebak daerah", "11"],
			["Tebak kode", "4"],
			["Tebak berwaktu", "3"]
		],
		right: { kind: "levels", values: [4, 10, 4] },
		notes: [
			["timer", "3", " soal Tebak berwaktu, mulai mengetik dalam 8 detik."],
			["circle-alert", "2", " kode Sulit Dikuasai menampilkan jawaban lebih dulu."],
			SCHEDULE
		],
		start: "Mulai"
	},
	harian: {
		icon: "calendar-check",
		title: "Tantangan Harian",
		facts: [
			["calendar-days", "Sekali sehari"],
			["layers", "Lintas Cakupan"]
		],
		count: "5",
		unit: "soal",
		aside: { label: "Perkiraan durasi", icon: "clock", value: "Kurang dari 1 menit" },
		types: [
			["Tebak daerah", "3"],
			["Tebak kode", "1"],
			["Mana yang bukan", "1"]
		],
		right: {
			kind: "streak",
			days: 12,
			note: "Selesaikan hari ini untuk mencatat Hari Beruntun. Jawaban tidak mengubah jadwal belajar."
		},
		start: "Mulai tantangan"
	},
	kilat: {
		icon: "zap",
		title: "Mode Kilat",
		scope: { group: "balinusra", label: "Kawasan Bali & Nusa Tenggara" },
		count: "60",
		unit: "detik",
		aside: {
			label: "Rekor wilayah ini",
			icon: "trophy",
			value: "Rekor terbaik di Kawasan Bali & Nusa Tenggara: 31"
		},
		types: [
			["Benar atau salah", "acak"],
			["Mengenali kawasan", "acak"],
			["Mengenali huruf pertama", "acak"]
		],
		right: {
			kind: "rules",
			rows: [
				["Jadwal belajar", "tidak berubah"],
				["Batalkan jawaban", "tidak tersedia"],
				["Rekor dicatat", "per wilayah"]
			]
		},
		start: "Mulai"
	},
	terfokus: {
		icon: "crosshair",
		title: "Latihan Terfokus",
		scope: { group: "maluku", label: "Kawasan Maluku" },
		description:
			"Latihan tambahan. Hanya soal yang sudah waktunya diulang yang dapat memengaruhi jadwal.",
		count: "12",
		unit: "soal",
		aside: { label: "Perkiraan durasi", icon: "clock", value: "Sekitar 4–6 menit waktu aktif" },
		composition: [
			["Dihitung untuk jadwal", 4, "bg-ink-1000"],
			["Latihan tambahan", 8, "bg-ink-200"]
		],
		types: [
			["Tebak daerah", "7"],
			["Tebak kode", "3"],
			["Tebak berwaktu", "2"]
		],
		right: { kind: "levels", values: [3, 7, 2] },
		notes: [["timer", "2", " soal Tebak berwaktu, mulai mengetik dalam 8 detik."]],
		start: "Mulai"
	},
	diplomat: {
		icon: "flag",
		title: "Kode diplomat",
		facts: [["calendar-days", "Jadwal terpisah dari latihan wilayah"]],
		count: "8",
		unit: "soal",
		aside: { label: "Perkiraan durasi", icon: "clock", value: "Sekitar 1–2 menit waktu aktif" },
		composition: [
			["Pengulangan", 6, "bg-ink-1000"],
			["Materi baru", 2, "bg-caution-500"]
		],
		types: [
			["Tebak diplomat dari kode", "6"],
			["Tebak diplomat dari pemegang", "2"]
		],
		right: { kind: "levels", values: [2, 4, 2] },
		notes: [["info", null, "Nomor urut di belakang kode negara tidak dilatih."]],
		start: "Mulai"
	},
	sebutkan: {
		icon: "play",
		title: "Sebutkan sebanyak mungkin",
		facts: [["layers", "Satu kode per sesi, di luar sesi harian"]],
		count: "1",
		unit: "kode",
		aside: { label: "Perkiraan durasi", icon: "clock", value: "Sekitar 1–2 menit waktu aktif" },
		types: [["Sebutkan daerah BK", "15 kab/kota"]],
		right: { kind: "levels", values: [0, 0, 1] },
		start: "Mulai"
	}
};
