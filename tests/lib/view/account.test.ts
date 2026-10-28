import { expect, test } from "bun:test";
import type { DeviceInfo } from "../../../src/lib/db/device";
import { deviceRows, exportLabel, importMessage } from "../../../src/lib/view/account";

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

const MAC =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/129 Safari/537.36";
const IPHONE =
	"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/129 Mobile Safari/604.1";
const device = (id: string, platform: string, ago: number, removedAt: number | null = null) =>
	({
		id,
		label: "Browser",
		platform,
		lastSeenAt: NOW - ago,
		removedAt
	}) satisfies DeviceInfo;

test("the device list puts this session first and the others by last activity", () => {
	const list = [
		device("old", IPHONE, 5 * 3_600_000),
		device("me", MAC, 2 * 86_400_000),
		device("new", MAC, 30_000)
	];
	expect(deviceRows(list, "me", NOW)).toEqual([
		{ id: "me", name: "Chrome di Mac", icon: "monitor", note: "Sesi ini", current: true },
		{
			id: "new",
			name: "Chrome di Mac",
			icon: "monitor",
			note: "Terakhir aktif baru saja",
			current: false
		},
		{
			id: "old",
			name: "Chrome di iPhone",
			icon: "smartphone",
			note: "Terakhir aktif 5 jam lalu",
			current: false
		}
	]);
});

test("the device list leaves out devices unseen for more than a week and removed ones", () => {
	const week = 7 * 86_400_000;
	const list = [
		device("me", MAC, 0),
		device("edge", IPHONE, week),
		device("stale", IPHONE, week + 1),
		device("gone", IPHONE, 1_000, NOW - 500)
	];
	expect(deviceRows(list, "me", NOW).map((row) => row.id)).toEqual(["me", "edge"]);
});

test("this device stays listed however long ago it was seen, even if marked removed", () => {
	const list = [device("me", MAC, 30 * 86_400_000, NOW - 1_000)];
	expect(deviceRows(list, "me", NOW).map((row) => row.id)).toEqual(["me"]);
});

test("a device never seen is listed only when it is this one", () => {
	const list = [
		{ ...device("me", MAC, 0), lastSeenAt: null },
		{ ...device("x", MAC, 0), lastSeenAt: null }
	];
	expect(deviceRows(list, "me", NOW).map((row) => row.id)).toEqual(["me"]);
});
