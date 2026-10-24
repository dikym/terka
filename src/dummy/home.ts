import type { GroupId } from "@/components/ui/groups";
import type { HomeSummary } from "@/core/views/home";

export type DayMark = { day: string; state: "done" | "tolerance" | "today" };

export const home = {
	summary: {
		due: 12,
		newAvailable: 4,
		held: false,
		allIntroduced: false,
		nextDueAt: null,
		specialDue: null,
		challenge: "available",
		placementOffer: false,
		streak: 12
	} satisfies HomeSummary,
	dateLabel: "Minggu, 27 September 2026",
	syncLabel: "Tersinkron 3 menit lalu",
	duration: "Sekitar 6–9 menit waktu aktif",
	reviewsOutsideScope: 5,
	newLimit: 10,
	pairs: [
		{ a: "BE", b: "BD", group: "sumatera" },
		{ a: "AA", b: "AD", group: "jawa" }
	] satisfies { a: string; b: string; group: GroupId }[],
	scope: {
		group: "balinusra" as GroupId,
		title: "Kawasan Bali & Nusa Tenggara",
		rows: [
			{ name: "Bali", codes: ["DK"], percent: 100 },
			{ name: "Nusa Tenggara Barat", codes: ["DR", "EA"], percent: 60 },
			{ name: "Nusa Tenggara Timur", codes: ["DH", "EB", "ED"], percent: 38 }
		],
		mastered: "64%",
		newInScope: "10",
		newOutside: "148"
	},
	week: [
		{ day: "Sen", state: "done" },
		{ day: "Sel", state: "done" },
		{ day: "Rab", state: "done" },
		{ day: "Kam", state: "tolerance" },
		{ day: "Jum", state: "done" },
		{ day: "Sab", state: "done" },
		{ day: "Min", state: "today" }
	] satisfies DayMark[],
	tolerance: "Toleransi terpakai 1 dari 1 dalam 30 hari.",
	challengeCountdown: "06:42:18"
};

export type Home = typeof home;

export const dataChange = {
	from: "2026.06.14",
	to: "2026.09.24",
	items: [
		{ title: "2 kode baru", note: "Masuk sebagai materi baru di kawasannya." },
		{ title: "1 nama daerah berubah", note: "Riwayat kode tetap utuh." },
		{ title: "3 kode dinonaktifkan", note: "Dinonaktifkan, data perlu diverifikasi" },
		{
			title: "1 pemegang kode CD berubah",
			note: "Kode lama dinonaktifkan; pemegang baru jadi materi baru Kode diplomat."
		}
	]
};
