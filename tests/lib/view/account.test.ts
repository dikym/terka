import { expect, test } from "bun:test";
import { exportLabel, importMessage } from "../../../src/lib/view/account";

const NOW = Date.parse("2026-10-25T08:00:00Z");

test("the export line names how long ago the last export was", () => {
	expect(exportLabel(null, NOW)).toBe("Belum pernah ekspor");
	expect(exportLabel(NOW - 12 * 86_400_000, NOW)).toBe("Ekspor terakhir 12 hari lalu");
});

test("import outcomes read as the account screen messages", () => {
	expect(
		importMessage({
			status: "ok",
			added: { review_logs: 320 },
			existing: { review_logs: 1240 }
		})
	).toEqual({ tone: "success", text: "Data diimpor. 320 jawaban ditambahkan, 1.240 sudah ada." });
	expect(
		importMessage({ status: "invalid", reason: "formatVersion: Invalid literal value" })
	).toEqual({
		tone: "warn",
		text: "File ini dibuat Terka versi lain dan tidak dapat diimpor. Tidak ada data yang diubah."
	});
	expect(importMessage({ status: "invalid", reason: "the file is not JSON" }).text).toBe(
		"File ini bukan ekspor Terka. Tidak ada data yang diubah."
	);
	expect(importMessage({ status: "quota" }).text).toBe(
		"Penyimpanan perangkat penuh. Ekspor data, lalu kosongkan ruang penyimpanan."
	);
});
