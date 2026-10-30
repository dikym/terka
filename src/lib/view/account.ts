import { type DeviceIcon, deviceIcon, deviceName } from "../app/device-label";
import type { DeviceInfo } from "../db/device";
import type { ImportResult } from "../db/transfer";
import { LISTED_DEVICE_DAYS } from "@/rules";
import { ago, count } from "./format";

export const exportLabel = (lastExportAt: number | null, now: number) =>
	lastExportAt === null ? "Belum pernah ekspor" : `Ekspor terakhir ${ago(now - lastExportAt)}`;

export const mergedMessage = (answers: number) =>
	`Riwayat di perangkat ini digabung ke akun. ${answers ? `${count(answers)} jawaban` : "Tidak ada jawaban"} ditambahkan.`;

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

export type DeviceRow = {
	id: string;
	name: string;
	icon: DeviceIcon;
	note: string;
	current: boolean;
};

const DAY = 86_400_000;

/** The devices worth listing: this one first, then the others seen recently, newest first. */
export function deviceRows(list: DeviceInfo[], currentId: string, now: number): DeviceRow[] {
	const seenAt = (device: DeviceInfo) => device.lastSeenAt ?? 0;
	const listed = list.filter(
		(device) =>
			device.id === currentId ||
			(device.removedAt === null && now - seenAt(device) <= LISTED_DEVICE_DAYS * DAY)
	);
	listed.sort(
		(a, b) => Number(b.id === currentId) - Number(a.id === currentId) || seenAt(b) - seenAt(a)
	);
	return listed.map((device) => ({
		id: device.id,
		name: deviceName(device.platform, device.label),
		icon: deviceIcon(device.platform, device.label),
		note: device.id === currentId ? "Sesi ini" : `Terakhir aktif ${ago(now - seenAt(device))}`,
		current: device.id === currentId
	}));
}
