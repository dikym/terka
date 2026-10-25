import { expect, test } from "bun:test";
import { syncLabel } from "../../../src/lib/view/sync-label";

const NOW = Date.parse("2026-10-25T08:00:00Z");

test("sync states read as the account screen copy", () => {
	expect(syncLabel({ quarantined: 0, state: "pending", count: 12 }, true, NOW)).toBe(
		"12 perubahan menunggu sinkronisasi"
	);
	expect(syncLabel({ quarantined: 0, state: "offline" }, true, NOW)).toBe(
		"Sedang offline. Perubahan disimpan di perangkat ini."
	);
	expect(
		syncLabel({ quarantined: 0, state: "synced", lastSyncAt: NOW - 3 * 60_000 }, true, NOW)
	).toBe("Tersinkron 3 menit lalu");
	expect(syncLabel({ quarantined: 0, state: "unreachable", days: 4 }, true, NOW)).toBe(
		"Server sinkronisasi tidak terjangkau sejak 4 hari lalu. Latihan tetap berjalan."
	);
});

test("without an account the progress stays on this device", () => {
	expect(syncLabel(null, false, NOW)).toBe("Tersimpan di perangkat ini");
});

test("a signed-in device that has not synced yet says so", () => {
	expect(syncLabel(null, true, NOW)).toBe("Menyinkronkan…");
});
