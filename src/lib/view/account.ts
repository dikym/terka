import type { ImportResult } from "../db/transfer";
import { ago, count } from "./format";

export const exportLabel = (lastExportAt: number | null, now: number) =>
	lastExportAt === null ? "Belum pernah ekspor" : `Ekspor terakhir ${ago(now - lastExportAt)}`;

export const mergedMessage = (answers: number) =>
	`Riwayat di perangkat ini digabung ke akun. ${count(answers)} jawaban ditambahkan.`;

export function importMessage(result: ImportResult): { tone: "success" | "warn"; text: string } {
	if (result.status === "ok") {
		const answers = (counts: Record<string, number>) => count(counts.review_logs ?? 0);
		return {
			tone: "success",
			text: `Data diimpor. ${answers(result.added)} jawaban ditambahkan, ${answers(result.existing)} sudah ada.`
		};
	}
	if (result.status === "quota")
		return {
			tone: "warn",
			text: "Penyimpanan perangkat penuh. Ekspor data, lalu kosongkan ruang penyimpanan."
		};
	return {
		tone: "warn",
		text: /formatVersion|engineVersion/.test(result.reason)
			? "File ini dibuat Terka versi lain dan tidak dapat diimpor. Tidak ada data yang diubah."
			: "File ini bukan ekspor Terka. Tidak ada data yang diubah."
	};
}
