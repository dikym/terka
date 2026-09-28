import { DAY, type Progress } from "./model";
import { exportBackup, type LearningStore, type Repository } from "./storage";
import { EXPORT_REMINDER_DAYS } from "../../rules";

export type BackupDirectory = {
	queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
	requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
	getFileHandle(
		name: string,
		options: { create: boolean }
	): Promise<{
		createWritable(): Promise<{
			write(data: string): Promise<void>;
			close(): Promise<void>;
			abort(): Promise<void>;
		}>;
	}>;
};

function isDirectory(value: unknown): value is BackupDirectory {
	return (
		value !== null &&
		typeof value === "object" &&
		"queryPermission" in value &&
		typeof value.queryPermission === "function" &&
		"requestPermission" in value &&
		typeof value.requestPermission === "function" &&
		"getFileHandle" in value &&
		typeof value.getFileHandle === "function"
	);
}

export function backupStatus(
	progress: Progress,
	now: number,
	supported = typeof window !== "undefined" && "showDirectoryPicker" in window
) {
	const age =
		progress.lastBackupAt === null ? Infinity : Math.max(0, now - progress.lastBackupAt);
	return {
		automaticSupported: supported,
		weeklyDue: age >= 7 * DAY,
		overdue: age > EXPORT_REMINDER_DAYS * DAY,
		lastBackupAt: progress.lastBackupAt,
		message: !supported
			? "Cadangan otomatis belum didukung di peramban ini. Unduh cadangan secara manual."
			: age > EXPORT_REMINDER_DAYS * DAY
				? `Ekspor terakhir sudah lebih dari ${EXPORT_REMINDER_DAYS} hari.`
				: null
	};
}

export async function connectBackupFolder(repository: Repository) {
	if (
		typeof window === "undefined" ||
		!("showDirectoryPicker" in window) ||
		typeof window.showDirectoryPicker !== "function"
	)
		throw new Error(
			"Cadangan otomatis belum didukung di peramban ini. Unduh cadangan secara manual."
		);
	const directory: unknown = await window.showDirectoryPicker({ mode: "readwrite" });
	if (
		!isDirectory(directory) ||
		(await directory.requestPermission({ mode: "readwrite" })) !== "granted"
	)
		throw new Error("Akses ke folder cadangan terputus. Pilih folder lagi.");
	await repository.setLocal("backupDirectory", directory);
}

export async function writeBackup(directory: BackupDirectory, progress: Progress, now: number) {
	if ((await directory.queryPermission({ mode: "readwrite" })) !== "granted")
		throw new Error("Akses ke folder cadangan terputus. Pilih folder lagi.");
	const file = await directory.getFileHandle("terka-progress.json", { create: true });
	const writer = await file.createWritable();
	try {
		await writer.write(exportBackup({ ...progress, lastBackupAt: now }));
		await writer.close();
	} catch (error) {
		try {
			await writer.abort();
		} catch {
			/* The original write/close error is the actionable failure. */
		}
		throw error;
	}
}

export async function automaticBackup(
	client: LearningStore,
	repository: Repository,
	now: number,
	force = false
) {
	const { progress, status } = client.store.getState();
	if (status !== "ready" || !progress) throw new Error("Storage is not ready");
	if (!force && !backupStatus(progress, now).weeklyDue) return { status: "current" as const };
	const directory = await repository.getLocal("backupDirectory");
	if (!isDirectory(directory)) return { status: "choose-folder-or-download" as const };
	try {
		await writeBackup(directory, progress, now);
		await client.dispatch(crypto.randomUUID(), (current) => ({
			...current,
			lastBackupAt: now
		}));
		return { status: "saved" as const };
	} catch (error) {
		return {
			status: "failed" as const,
			message: error instanceof Error ? error.message : "Cadangan belum tersimpan. Coba lagi."
		};
	}
}

export function manualBackup(progress: Progress): Blob {
	return new Blob([exportBackup(progress)], { type: "application/json" });
}

// The caller must confirm the file was saved; creating a Blob cannot prove that.
export async function acknowledgeManualBackup(client: LearningStore, savedAt: number) {
	if (!Number.isFinite(savedAt) || savedAt < 0) throw new Error("Invalid backup timestamp");
	return client.dispatch(crypto.randomUUID(), (progress) => ({
		...progress,
		lastBackupAt: savedAt
	}));
}

export async function requestPersistentStorage(
	client: LearningStore,
	storage: Pick<StorageManager, "persist"> | undefined = typeof navigator === "undefined"
		? undefined
		: navigator.storage
) {
	const { progress, status } = client.store.getState();
	if (!progress || status !== "ready") throw new Error("Storage is not ready");
	if (progress.storagePersistent !== null) return progress.storagePersistent;
	let persistent = false;
	try {
		persistent = (await storage?.persist()) ?? false;
	} catch {
		persistent = false;
	}
	await client.dispatch(crypto.randomUUID(), (current) => ({
		...current,
		storagePersistent: persistent
	}));
	return persistent;
}

// Call at application open, and automaticBackup again at session completion.
export async function openLearning(
	client: LearningStore,
	repository: Repository,
	now: number,
	timezone?: string
) {
	await client.initialize(now, timezone);
	const persistent = await requestPersistentStorage(client);
	const backup = await automaticBackup(client, repository, now);
	return { persistent, backup };
}
