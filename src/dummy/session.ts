import type { GroupId } from "@/components/ui/groups";
import type { FlagCode } from "@/components/ui/icon";

export type Mode = "hariIni" | "harian" | "kilat" | "terfokus" | "diplomat" | "sebutkan";

const PARAMS: Record<string, Mode> = {
	harian: "harian",
	kilat: "kilat",
	terfokus: "terfokus",
	diplomat: "diplomat",
	sebutkan: "sebutkan"
};

export const modeFromParam = (value: string | null): Mode =>
	value && Object.hasOwn(PARAMS, value) ? PARAMS[value] : "hariIni";

export type CardForm =
	| "tebakDaerah"
	| "tebakKode"
	| "tebakBerwaktu"
	| "sebutkan"
	| "perkenalan"
	| "benarSalah"
	| "manaBukan"
	| "tebakDiplomat"
	| "bandingkan"
	| "kawasan";

export type Level = 1 | 2 | 3;

export type DummyCard = {
	id: string;
	form: CardForm;
	/** Plate parts; the first part is the one asked about. */
	plate?: [string, string?, string?];
	prompt: string;
	answer: string;
	aliases?: string[];
	/** The answer's flag, for diplomat cards. */
	flag?: FlagCode;
	/** Choice forms only. */
	options?: string[];
	/** The level-1 choices a typed card turns into when its level is lowered. */
	lowerOptions?: string[];
	choiceGroups?: GroupId[];
	level: Level;
	/** Form label shown in the session bar; `tone` picks its colour. */
	pill?: { label: string; tone: "caution" | "go" | "grape" };
	/** Seconds to start answering (Tebak berwaktu) or to answer at all (Benar atau salah). */
	timer?: { seconds: number; kind: "start" | "answer" };
	leech?: { code: string; areas: string[]; more: number; note: string };
	notice?: string;
	compare?: { lead: string; hint: string };
	graded?: { aliasNote?: string; review?: string };
	intro?: { code: string; areas: string[]; wrongTag?: Record<string, string> };
	offerNote?: boolean;
	lowerable?: boolean;
};

const TEBAK_DAERAH = { label: "Tebak daerah", tone: "caution" } as const;

export const QUEUES: Record<Mode, DummyCard[]> = {
	hariIni: [
		{
			id: "bk-benar",
			form: "benarSalah",
			plate: ["BK"],
			prompt: "BK dipakai Kota Medan.",
			answer: "Benar",
			options: ["Benar", "Salah"],
			level: 1,
			pill: { label: "Benar atau salah", tone: "caution" },
			timer: { seconds: 3, kind: "answer" }
		},
		{
			id: "da-sulit",
			form: "tebakDaerah",
			plate: ["DA"],
			prompt: "DA dipakai daerah mana?",
			answer: "Kalimantan Selatan",
			aliases: ["Kalsel", "Banjarmasin"],
			level: 3,
			pill: TEBAK_DAERAH,
			leech: {
				code: "DA",
				areas: [
					"Kota Banjarmasin",
					"Kota Banjarbaru",
					"Kabupaten Banjar",
					"Kabupaten Tapin",
					"Kabupaten Hulu Sungai Selatan"
				],
				more: 8,
				note: "DA — Banjarmasin, kota seribu sungai."
			}
		},
		{
			id: "bukittinggi",
			form: "tebakKode",
			prompt: "Kode pelat Kota Bukittinggi?",
			answer: "BA",
			level: 2,
			pill: { label: "Tebak kode", tone: "caution" }
		},
		{
			id: "bk-bukan",
			form: "manaBukan",
			plate: ["BK"],
			prompt: "Mana yang tidak memakai BK?",
			answer: "Kota Bukittinggi",
			options: ["Kota Medan", "Kota Binjai", "Kota Pematangsiantar", "Kota Bukittinggi"],
			level: 1,
			pill: { label: "Mana yang bukan", tone: "caution" }
		},
		{
			id: "da-4821",
			form: "tebakDaerah",
			plate: ["DA", "4821", "LK"],
			prompt: "DA dipakai daerah mana?",
			answer: "Kalimantan Selatan",
			aliases: ["Kalsel", "Banjarmasin"],
			lowerOptions: [
				"Kalimantan Selatan",
				"Kalimantan Timur",
				"Kalimantan Tengah",
				"Sulawesi Selatan"
			],
			level: 2,
			lowerable: true,
			graded: {
				aliasNote: "Alias diterima: Kalsel, Banjarmasin",
				review: "diulang lagi dalam 30 jam"
			}
		},
		{
			id: "ad",
			form: "tebakDaerah",
			plate: ["AD"],
			prompt: "AD dipakai daerah mana?",
			answer: "Surakarta",
			aliases: ["Solo", "Jawa Tengah"],
			level: 2,
			pill: TEBAK_DAERAH
		},
		{
			id: "bengkulu",
			form: "bandingkan",
			prompt: "Mana yang Bengkulu?",
			answer: "BE",
			options: ["BD", "BE"],
			level: 3,
			pill: { label: "Bandingkan Kode", tone: "grape" },
			compare: {
				lead: "BE dan BD sering tertukar. Bedakan keduanya.",
				hint: "BD Kabupaten Dharmasraya, Sumatera Barat. BE Bengkulu — huruf E seperti Enggano, pulau di lepas pantai Bengkulu."
			}
		},
		{
			id: "bd",
			form: "tebakDaerah",
			plate: ["BD"],
			prompt: "BD dipakai daerah mana?",
			answer: "Bengkulu",
			level: 2,
			pill: TEBAK_DAERAH,
			offerNote: true
		},
		{
			id: "bm",
			form: "tebakBerwaktu",
			plate: ["BM"],
			prompt: "BM dipakai daerah mana?",
			answer: "Riau",
			aliases: ["Pekanbaru"],
			level: 3,
			pill: { label: "Tebak berwaktu", tone: "caution" },
			timer: { seconds: 8, kind: "start" }
		},
		{
			id: "ag",
			form: "tebakDaerah",
			plate: ["AG"],
			prompt: "AG dipakai daerah mana?",
			answer: "Kota Kediri",
			aliases: ["Kediri"],
			lowerOptions: ["Kota Kediri", "Kota Semarang", "Kota Madiun", "Kota Pekalongan"],
			level: 3,
			pill: TEBAK_DAERAH,
			lowerable: true
		},
		{
			id: "dk",
			form: "perkenalan",
			plate: ["DK"],
			prompt: "DK dipakai daerah mana?",
			answer: "Denpasar",
			options: ["Denpasar", "Mataram", "Kupang", "Makassar"],
			level: 1,
			pill: { label: "Materi baru", tone: "go" },
			intro: {
				code: "DK",
				areas: [
					"Denpasar",
					"Badung",
					"Gianyar",
					"Tabanan",
					"Buleleng",
					"Bangli",
					"Klungkung",
					"Karangasem",
					"Jembrana"
				],
				wrongTag: { Mataram: "EA", Kupang: "DH", Makassar: "DD" }
			}
		}
	],
	harian: [
		{
			id: "harian-da",
			form: "tebakDaerah",
			plate: ["DA"],
			prompt: "DA dipakai daerah mana?",
			answer: "Kalimantan Selatan",
			aliases: ["Kalsel"],
			level: 2
		},
		{
			id: "harian-ab",
			form: "tebakDaerah",
			plate: ["AB"],
			prompt: "AB dipakai daerah mana?",
			answer: "Yogyakarta",
			aliases: ["Jogja", "DIY"],
			level: 2
		},
		{
			id: "harian-tangerang",
			form: "tebakKode",
			prompt: "Kode pelat Kabupaten Tangerang?",
			answer: "B",
			level: 2
		},
		{
			id: "harian-bukan",
			form: "manaBukan",
			plate: ["BK"],
			prompt: "Mana yang tidak memakai BK?",
			answer: "Kota Bukittinggi",
			options: ["Kota Medan", "Kota Binjai", "Kota Pematangsiantar", "Kota Bukittinggi"],
			level: 1
		},
		{
			id: "harian-dk",
			form: "tebakDaerah",
			plate: ["DK"],
			prompt: "DK dipakai daerah mana?",
			answer: "Bali",
			aliases: ["Denpasar"],
			level: 2
		}
	],
	kilat: [
		{
			id: "kilat-eb",
			form: "kawasan",
			plate: ["EB"],
			prompt: "EB dipakai kawasan mana?",
			answer: "Bali & Nusa Tenggara",
			options: ["Sumatera", "Bali & Nusa Tenggara", "Sulawesi", "Maluku"],
			choiceGroups: ["sumatera", "balinusra", "sulawesi", "maluku"],
			level: 1
		},
		{
			id: "kilat-bk",
			form: "benarSalah",
			plate: ["BK"],
			prompt: "BK dipakai Kota Medan.",
			answer: "Benar",
			options: ["Benar", "Salah"],
			level: 1
		},
		{
			id: "kilat-kt",
			form: "kawasan",
			plate: ["KT"],
			prompt: "KT dipakai kawasan mana?",
			answer: "Kalimantan",
			options: ["Jawa", "Kalimantan", "Papua", "Sumatera"],
			choiceGroups: ["jawa", "kalimantan", "papua", "sumatera"],
			level: 1
		},
		{
			id: "kilat-dk",
			form: "benarSalah",
			plate: ["DK"],
			prompt: "DK dipakai Kota Mataram.",
			answer: "Salah",
			options: ["Benar", "Salah"],
			level: 1
		},
		{
			id: "kilat-pa",
			form: "kawasan",
			plate: ["PA"],
			prompt: "PA dipakai kawasan mana?",
			answer: "Papua",
			options: ["Maluku", "Sulawesi", "Papua", "Bali & Nusa Tenggara"],
			choiceGroups: ["maluku", "sulawesi", "papua", "balinusra"],
			level: 1
		}
	],
	terfokus: [
		{
			id: "terfokus-de",
			form: "tebakDaerah",
			plate: ["DE"],
			prompt: "DE dipakai daerah mana?",
			answer: "Maluku",
			aliases: ["Ambon"],
			level: 2,
			notice: "Soal ini juga dihitung untuk jadwal hari ini."
		},
		{
			id: "terfokus-dg",
			form: "tebakDaerah",
			plate: ["DG"],
			prompt: "DG dipakai daerah mana?",
			answer: "Maluku Utara",
			aliases: ["Ternate"],
			level: 2
		},
		{
			id: "terfokus-ambon",
			form: "tebakKode",
			prompt: "Kode pelat Kota Ambon?",
			answer: "DE",
			level: 2
		}
	],
	diplomat: [
		{
			id: "cd-49",
			form: "tebakDiplomat",
			plate: ["CD", "49"],
			prompt: "CD 49 dipakai perwakilan mana?",
			answer: "Jepang",
			aliases: ["Japan"],
			flag: "jp",
			level: 2
		},
		{
			id: "cd-45",
			form: "tebakDiplomat",
			plate: ["CD", "45"],
			prompt: "CD 45 dipakai perwakilan mana?",
			answer: "Iran",
			flag: "ir",
			level: 2
		},
		{
			id: "cd-58",
			form: "tebakDiplomat",
			plate: ["CD", "58"],
			prompt: "CD 58 dipakai perwakilan mana?",
			answer: "UNDP",
			flag: "un",
			level: 2
		}
	],
	sebutkan: [
		{
			id: "sebutkan-bk",
			form: "sebutkan",
			plate: ["BK"],
			prompt: "Sebutkan daerah yang memakai BK.",
			answer: "Medan",
			level: 3,
			pill: { label: "Sebutkan sebanyak mungkin", tone: "caution" }
		}
	]
};

/** Mode Kilat runs on one clock for the whole round. */
export const KILAT_SECONDS = 60;
