import { expect, test } from "bun:test";
import { lastSyncLabel, syncLabel } from "../../../src/lib/view/sync-label";

const NOW = Date.parse("2026-10-25T08:00:00Z");

test("sync states read as the account screen copy", () => {
	expect(
		syncLabel({ quarantined: 0, lastSyncAt: null, state: "pending", count: 12 }, true, NOW)
	).toBe("12 perubahan menunggu sinkronisasi");
	expect(syncLabel({ quarantined: 0, lastSyncAt: null, state: "offline" }, true, NOW)).toBe(
		"Sedang offline. Perubahan disimpan di perangkat ini."
	);
	expect(
		syncLabel({ quarantined: 0, lastSyncAt: NOW - 3 * 60_000, state: "synced" }, true, NOW)
	).toBe("Tersinkron 3 menit lalu");
	expect(
		syncLabel({ quarantined: 0, lastSyncAt: null, state: "unreachable", days: 4 }, true, NOW)
	).toBe("Server sinkronisasi tidak terjangkau sejak 4 hari lalu. Latihan tetap berjalan.");
});

test("without an account the progress stays on this device", () => {
	expect(syncLabel(null, false, NOW)).toBe("Tersimpan di perangkat ini");
});

test("a signed-in device that has not synced yet says so", () => {
	expect(syncLabel(null, true, NOW)).toBe("Menyinkronkan…");
});

test("the last sync time shows in any state, and a device that never synced says so", () => {
	const offline = { quarantined: 0, lastSyncAt: NOW - 2 * 3_600_000, state: "offline" } as const;
	expect(lastSyncLabel(offline, NOW)).toBe("Sinkron terakhir 2 jam lalu");
	expect(lastSyncLabel({ ...offline, lastSyncAt: null }, NOW)).toBe("Belum pernah sinkron");
	expect(lastSyncLabel(null, NOW)).toBe("Belum pernah sinkron");
});
