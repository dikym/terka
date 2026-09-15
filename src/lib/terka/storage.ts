import Dexie, { type Table } from "dexie";
import { createStore } from "zustand/vanilla";
import { createProgress, parseContent, parseProgress, reconcileContent } from "./content";
import { refreshProgress } from "./engine";
import type { Content, Progress } from "./model";

type SavedProgress = { id: "progress"; revision: number; progress: Progress };
type Operation = { id: string; fingerprint: string };
type LocalValue = { key: string; value: unknown };

export function createRepository(name = "terka") {
	// ponytail: one atomic progress snapshot; split reviews into indexed rows if multi-year histories make saves slow.
	const db = new Dexie(name);
	db.version(1).stores({ snapshots: "id", operations: "id", local: "key" });
	const snapshots: Table<SavedProgress, string> = db.table("snapshots");
	const operations: Table<Operation, string> = db.table("operations");
	const local: Table<LocalValue, string> = db.table("local");
	let ready = false;
	return {
		db,
		async load() {
			ready = false;
			const saved = await snapshots.get("progress");
			if (saved) {
				if (!Number.isSafeInteger(saved.revision) || saved.revision < 1)
					throw new Error("Invalid storage revision");
				saved.progress = parseProgress(saved.progress);
			}
			ready = true;
			return saved ?? null;
		},
		async commit(expectedRevision: number, value: Progress, operationId: string) {
			if (!ready) throw new Error("Read progress successfully before writing");
			if (!operationId.trim()) throw new Error("Operation ID is required");
			const progress = parseProgress(value);
			const bytes = new TextEncoder().encode(JSON.stringify(progress));
			const fingerprint = Array.from(
				new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
				(byte) => byte.toString(16).padStart(2, "0")
			).join("");
			return db.transaction("rw", snapshots, operations, async () => {
				const current = await snapshots.get("progress");
				const previous = await operations.get(operationId);
				if (previous) {
					if (previous.fingerprint !== fingerprint)
						throw new Error("Operation ID was reused with different data");
					if (!current) throw new Error("Stored operation has no progress");
					return { ...current, progress: parseProgress(current.progress) };
				}
				if ((current?.revision ?? 0) !== expectedRevision)
					throw new Error("Progress changed in another tab. Reload before retrying.");
				const next: SavedProgress = {
					id: "progress",
					revision: expectedRevision + 1,
					progress
				};
				await snapshots.put(next);
				await operations.put({ id: operationId, fingerprint });
				return next;
			});
		},
		async getLocal(key: string) {
			return (await local.get(key))?.value;
		},
		async setLocal(key: string, value: unknown) {
			if (!ready) throw new Error("Read progress successfully before writing");
			await local.put({ key, value });
		},
		close() {
			ready = false;
			db.close();
		}
	};
}

export type Repository = ReturnType<typeof createRepository>;

export function exportBackup(progress: Progress): string {
	return JSON.stringify({
		application: "terka",
		backupVersion: 1,
		progress: parseProgress(progress)
	});
}

export function restoreBackup(text: string, content: Content): Progress {
	const value: unknown = JSON.parse(text);
	if (
		!value ||
		typeof value !== "object" ||
		!("application" in value) ||
		value.application !== "terka" ||
		!("backupVersion" in value) ||
		value.backupVersion !== 1 ||
		!("progress" in value)
	)
		throw new Error("Unsupported Terka backup");
	return reconcileContent(parseProgress(value.progress), content);
}

type StoreState = {
	status: "idle" | "loading" | "ready" | "saving" | "error";
	progress: Progress | null;
	revision: number;
	error: string | null;
};

export function createLearningStore(repository: Repository, source: unknown) {
	const content = parseContent(source);
	const store = createStore<StoreState>(() => ({
		status: "idle",
		progress: null,
		revision: 0,
		error: null
	}));
	let pending: { revision: number; progress: Progress; operationId: string } | null = null;
	async function savePending() {
		if (!pending) throw new Error("No pending write");
		store.setState({ status: "saving", error: null });
		try {
			const saved = await repository.commit(
				pending.revision,
				pending.progress,
				pending.operationId
			);
			pending = null;
			store.setState({
				status: "ready",
				progress: saved.progress,
				revision: saved.revision,
				error: null
			});
			return saved.progress;
		} catch (error) {
			store.setState({
				status: "error",
				error:
					error instanceof Error ? error.message : "Perubahan belum tersimpan. Coba lagi."
			});
			throw error;
		}
	}
	return {
		store,
		content,
		async initialize(now: number, timezone?: string) {
			if (store.getState().status === "loading" || store.getState().status === "saving")
				throw new Error("Storage operation is in progress");
			store.setState({ status: "loading", error: null });
			pending = null;
			try {
				const saved = await repository.load();
				const progress = saved
					? refreshProgress(
							reconcileContent(saved.progress, content),
							content,
							now,
							timezone
						)
					: createProgress(content, now, timezone);
				pending = {
					revision: saved?.revision ?? 0,
					progress,
					operationId: crypto.randomUUID()
				};
				return await savePending();
			} catch (error) {
				store.setState({
					status: "error",
					error:
						error instanceof Error
							? error.message
							: "Data belajar tidak dapat dibuka. Coba muat ulang aplikasi."
				});
				throw error;
			}
		},
		async dispatch(
			operationId: string,
			command: (progress: Progress, content: Content) => Progress
		) {
			const current = store.getState();
			if (current.status !== "ready" || !current.progress)
				throw new Error("Storage is not ready");
			const progress = parseProgress(command(structuredClone(current.progress), content));
			if (JSON.stringify(progress) === JSON.stringify(current.progress))
				return current.progress;
			pending = { progress, revision: current.revision, operationId };
			return savePending();
		},
		async retry() {
			if (store.getState().status !== "error") throw new Error("No failed write to retry");
			return savePending();
		},
		async restore(text: string, operationId: string, now: number) {
			const current = store.getState();
			if (current.status !== "ready" || !current.progress)
				throw new Error("Storage is not ready");
			const backup = restoreBackup(text, content);
			const observed = refreshProgress(current.progress, content, now);
			// Day numbers belong to the backup's history, not the destination installation.
			const restored = refreshProgress(
				backup,
				content,
				observed.clock.lastSeen,
				observed.clock.timezone
			);
			restored.clock.nextBoundary = Math.max(
				restored.clock.nextBoundary,
				observed.clock.nextBoundary
			);
			restored.newCardsToday = [
				...new Set([...restored.newCardsToday, ...observed.newCardsToday])
			].slice(0, 10);
			restored.newPaused ||= observed.newPaused;
			restored.storagePersistent = current.progress.storagePersistent;
			restored.lastBackupAt = current.progress.lastBackupAt;
			restored.currentQuestion = null;
			restored.undo = null;
			pending = {
				progress: restored,
				revision: current.revision,
				operationId
			};
			return savePending();
		}
	};
}

export type LearningStore = ReturnType<typeof createLearningStore>;
