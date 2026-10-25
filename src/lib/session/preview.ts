import type { GroupId } from "@/components/ui/groups";
import type { IconName } from "@/components/ui/icon";
import type { InfoItem, Preview as CorePreview } from "@/core/session/preview";
import { TIERS, TIMED_LIMIT_MS, type Tier } from "@/rules";
import { TIER_NAME } from "../view/format";

/** What the preview screen draws. */
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
	/** A way past this session to the ordinary one. */
	skip?: { label: string; href: string };
	start: string;
};

export function composition(counts: CorePreview["counts"]): [string, number, string][] {
	const rows: [string, number, string][] = [
		["Pengulangan", counts.review + counts.step, "bg-ink-1000"],
		["Materi baru", counts.new, "bg-caution-500"],
		["Bandingkan Kode", counts.drill, "bg-tangerine-500"]
	];
	return rows.filter(([, value]) => value > 0);
}

export function typeRows(labels: string[]): [string, string][] {
	const counts = new Map<string, number>();
	for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
	return [...counts].map(([label, value]) => [label, String(value)]);
}

export type InfoCounts = {
	timed: number;
	leech: number;
	outside: number;
	/** The tier the day moved to, and whether it went up. */
	tier: { tier: Tier; up: boolean } | null;
};

export function infoNotes(
	info: InfoItem[],
	counts: InfoCounts
): [IconName, string | null, string][] {
	const notes: [IconName, string | null, string][] = [];
	for (const item of info) {
		if (item === "held")
			notes.push([
				"circle-alert",
				null,
				"Materi baru dijeda hari ini agar sesi tetap ringan."
			]);
		if (item === "timed")
			notes.push([
				"timer",
				String(counts.timed),
				` soal Tebak berwaktu: mulai mengetik dalam ${TIMED_LIMIT_MS / 1000} detik.`
			]);
		if (item === "leech")
			notes.push([
				"circle-alert",
				String(counts.leech),
				" kode Sulit Dikuasai menampilkan jawabannya dulu untuk dipelajari ulang."
			]);
		if (item === "outside-scope")
			notes.push([
				"layers",
				String(counts.outside),
				" soal dari luar Cakupan karena sudah waktunya diulang."
			]);
		if (item === "tier-changed" && counts.tier) {
			const { tier, up } = counts.tier;
			const limit = TIERS[tier].newPerDay;
			notes.push([
				"trending-up",
				null,
				up
					? `Tingkat naik ke ${TIER_NAME[tier]}. Materi baru per hari sekarang ${limit}.`
					: `Tingkat disesuaikan ke ${TIER_NAME[tier]}. Materi baru per hari sekarang ${limit}.`
			]);
		}
		if (item === "keyboard")
			notes.push(["keyboard", null, "Enter untuk menjawab · Z untuk membatalkan"]);
	}
	return notes;
}
