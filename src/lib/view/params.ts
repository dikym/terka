import type { FsrsParams } from "@/core/log/events";
import type { CountedAnswer } from "@/core/optimizer/counted";
import { optimizationProgress } from "@/core/optimizer/due";
import { paramsAt } from "@/core/replay/params";
import { localDay } from "@/core/time/day";
import { TARGET_RETENTION } from "@/rules";
import { count, decimal, shortDate } from "./format";

export type ParamsOutcome = "accepted" | "rejected" | "restored";

export type ParamsMetric = { name: string; before: string; after: string };

export type ParamsHistoryRow = {
	id: string;
	date: string;
	outcome: ParamsOutcome;
	label: string;
	title: string;
	detail: string;
	/** Null for a restore: its numbers describe the weights it put back, not a new result. */
	metrics: ParamsMetric[] | null;
	note: string;
};

export type ProgressLine = {
	label: string;
	have: string;
	need: string;
	/** 0–100. */
	percent: number;
	done: boolean;
};

export type ParamsView = {
	status: { title: string; note: string };
	/** Null while the counted answers are still being worked out. */
	progress: { title: string; note: string; lines: ProgressLine[] } | null;
	history: ParamsHistoryRow[];
};

// A restore row keeps the older weights as "new", so it is never better than its baseline.
function outcomeOf(row: FsrsParams): ParamsOutcome {
	if (row.status === "rejected") return "rejected";
	return row.logloss >= row.baselineLogloss ? "restored" : "accepted";
}

const OUTCOME = {
	accepted: {
		label: "Diterima",
		title: "Parameter pribadi diaktifkan",
		note: "Lolos uji pada riwayat terbaru.",
		answers: "dipakai"
	},
	rejected: {
		label: "Ditolak",
		title: "Hasil tidak dipakai",
		note: "Tidak cukup lebih baik dari parameter yang sedang dipakai.",
		answers: "dipakai"
	},
	restored: {
		label: "Dipulihkan",
		title: "Parameter sebelumnya dipulihkan",
		note: `Retensi sesudah aktivasi meleset dari target ${decimal(TARGET_RETENTION, 2)}.`,
		answers: "diperiksa"
	}
} as const;

function historyRow(row: FsrsParams, tz: string): ParamsHistoryRow {
	const outcome = outcomeOf(row);
	const text = OUTCOME[outcome];
	return {
		id: row.id,
		date: shortDate(localDay(row.createdAt, tz)),
		outcome,
		label: text.label,
		title: text.title,
		detail: `${count(row.trainedReviewCount)} jawaban ${text.answers}`,
		metrics:
			outcome === "restored"
				? null
				: [
						{
							name: "Log loss",
							before: decimal(row.baselineLogloss, 3),
							after: decimal(row.logloss, 3)
						},
						{
							name: "RMSE",
							before: decimal(row.baselineRmse, 3),
							after: decimal(row.rmse, 3)
						}
					],
		note: text.note
	};
}

function progressView(
	rows: readonly FsrsParams[],
	counted: readonly CountedAnswer[],
	now: number
): NonNullable<ParamsView["progress"]> {
	const progress = optimizationProgress(counted, rows, now);
	const first = progress.cards !== null;
	const lines = [
		{
			label: first ? "Jawaban terhitung" : "Jawaban baru sejak optimasi terakhir",
			...progress.reviews
		},
		...(progress.cards ? [{ label: "Kartu berbeda", ...progress.cards }] : []),
		...(progress.days ? [{ label: "Hari sejak optimasi terakhir", ...progress.days }] : [])
	].map(({ label, have, need }) => ({
		label,
		have: count(have),
		need: count(need),
		percent: Math.min(100, (have / need) * 100),
		done: have >= need
	}));
	const ready = lines.every((line) => line.done);
	return {
		title: ready ? "Syarat terpenuhi" : "Mengumpulkan data",
		note: ready
			? "Optimasi berjalan otomatis saat Terka tidak menampilkan soal."
			: "Optimasi berjalan otomatis begitu semua syarat terpenuhi. Hasilnya hanya dipakai jika lolos uji.",
		lines
	};
}

/**
 * `active` is the activation-sorted list of accepted rows from the replayed state; `rows` is every
 * optimization result, rejected ones included.
 */
export function paramsView(
	active: readonly FsrsParams[],
	rows: readonly FsrsParams[],
	counted: readonly CountedAnswer[] | null,
	now: number,
	tz: string
): ParamsView {
	const current = paramsAt(active, now);
	const since = current?.activatedAt ?? null;
	return {
		status:
			since === null
				? {
						title: "Bawaan FSRS-6",
						note: "Dipakai sejak jawaban pertama. Terka menyetelnya dari riwayatmu setelah datanya cukup."
					}
				: {
						title: "Pribadi",
						note: `Aktif sejak ${shortDate(localDay(since, tz))}. Dikembalikan otomatis jika hasilnya memburuk.`
					},
		progress: counted ? progressView(rows, counted, now) : null,
		history: [...rows]
			.sort((a, b) => b.createdAt - a.createdAt)
			.map((row) => historyRow(row, tz))
	};
}
