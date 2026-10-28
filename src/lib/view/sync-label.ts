import type { SyncStatus } from "@/lib/sync/status";
import { ACTIVE_DEVICE_DAYS, ACTIVE_DEVICE_LIMIT } from "@/rules";
import { ago } from "./format";

/** One line for the sync chip and the account screen. */
export function syncLabel(
	status: SyncStatus | null,
	signedIn: boolean,
	now: number,
	syncing = false
): string {
	if (!signedIn) return "Tersimpan di perangkat ini";
	if (!status || syncing) return "Menyinkronkan…";
	switch (status.state) {
		case "synced":
			return status.lastSyncAt === null
				? "Tersinkron"
				: `Tersinkron ${ago(now - status.lastSyncAt)}`;
		case "pending":
			return `${status.count} perubahan menunggu sinkronisasi`;
		case "offline":
			return "Sedang offline. Perubahan disimpan di perangkat ini.";
		case "sessionEnded":
			return "Sesi masuk berakhir. Masuk lagi untuk melanjutkan sinkronisasi.";
		case "unreachable":
			return `Server sinkronisasi tidak terjangkau sejak ${status.days} hari lalu. Latihan tetap berjalan.`;
		case "otherAccount":
			return "Data di perangkat ini milik akun lain.";
		case "outdated":
			return "Perbarui Terka untuk melanjutkan sinkronisasi. Data di perangkat ini tetap tersedia untuk diekspor.";
		case "staged":
			return `Riwayat di perangkat ini dikirim bertahap. ${status.sent} dari ${status.total} jawaban sudah tersinkron.`;
		case "dailyLimit":
			return "Batas pengiriman hari ini tercapai. Data tetap tersimpan dan akan dikirim setelah batas direset.";
		case "totalLimit":
			return "Batas penyimpanan akun tercapai. Data baru tetap di perangkat ini. Ekspor data untuk menyimpannya.";
		case "deviceLimit":
			return `Akun ini sudah dipakai di ${ACTIVE_DEVICE_LIMIT} perangkat dalam ${ACTIVE_DEVICE_DAYS} hari terakhir. Latihan tetap berjalan, dan data tersimpan di perangkat ini. Sinkronisasi dicoba lagi besok.`;
		case "signupsClosed":
			return "Sinkronisasi untuk akun baru sedang ditutup sementara. Latihan tetap berjalan, dan data tersimpan di perangkat ini.";
		case "consentNeeded":
			return "Kebijakan privasi diperbarui. Baca dan setujui untuk melanjutkan sinkronisasi.";
	}
}

/** When the last sync finished, whatever state the sync is in now. */
export function lastSyncLabel(status: SyncStatus | null, now: number): string {
	if (status?.lastSyncAt == null) return "Belum pernah sinkron";
	return `Sinkron terakhir ${ago(now - status.lastSyncAt)}`;
}

export type SyncIcon = "cloud-check" | "cloud-off" | "cloud-sync";

/** A cloud with a slash while nothing leaves this device, and circling arrows while a sync runs. */
export function syncIcon(status: SyncStatus | null, signedIn: boolean, syncing = false): SyncIcon {
	if (!signedIn) return "cloud-off";
	return syncing || status === null ? "cloud-sync" : "cloud-check";
}
