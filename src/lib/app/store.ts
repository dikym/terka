import { createStore } from "zustand/vanilla";
import type { Bundle } from "@/core/content/schema";
import type { LearningEvent } from "@/core/log/events";
import { loadState, record, type LogState } from "../db/log";
import type { TerkaDb } from "../db/schema";
import type { SyncStatus } from "../sync/status";

export type AppState = { log: LogState; sync: SyncStatus | null };
export type RecordOutcome = "ok" | "outdated" | "stale" | "quota";

export function createAppStore(boot: { db: TerkaDb; bundle: Bundle; log: LogState }) {
	const store = createStore<AppState>()(() => ({ log: boot.log, sync: null }));
	const listeners = new Set<() => void>();

	async function recordEvents(events: LearningEvent[]): Promise<RecordOutcome> {
		const result = await record(boot.db, store.getState().log, events, boot.bundle);
		if (result.status === "ok" || result.status === "outdated") {
			store.setState({ log: result.log });
			for (const listener of listeners) listener();
			return result.status;
		}
		if (result.status === "stale") {
			// Another tab wrote first: the caller rebuilds its session from the reloaded log.
			const loaded = await loadState(boot.db, boot.bundle);
			if (loaded.log) store.setState({ log: loaded.log });
			return "stale";
		}
		return "quota";
	}

	return {
		...store,
		db: boot.db,
		bundle: boot.bundle,
		record: recordEvents,
		onRecorded(listener: () => void) {
			listeners.add(listener);
			return () => void listeners.delete(listener);
		},
		// A sync round started from an older log must not undo answers recorded meanwhile.
		adopt(log: LogState, sync: SyncStatus | null) {
			const current = store.getState().log;
			store.setState({ log: log.logVersion >= current.logVersion ? log : current, sync });
		}
	};
}

export type AppStore = ReturnType<typeof createAppStore>;
