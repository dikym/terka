import type { SupabaseClient } from "@supabase/supabase-js";
import { createStore } from "zustand/vanilla";
import type { LogState } from "../db/log";
import { createScheduler } from "../sync/scheduler";
import { syncNow, type SyncResult } from "../sync/sync";
import type { AppStore } from "./store";

export type StartSyncDeps = {
	run: (log: LogState) => Promise<SyncResult>;
	now: () => number;
	setTimer: (callback: () => void, ms: number) => unknown;
	clearTimer: (handle: unknown) => void;
	target?: Pick<Window, "addEventListener" | "removeEventListener">;
	document?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
};

// Sync runs when the app opens, a few seconds after an answer, on return to the tab and when back online.
// Start it only for a signed-in account: without a session syncNow reports the session as ended.
export function startSync(store: AppStore, deps: StartSyncDeps): () => void {
	const target = deps.target ?? window;
	const doc = deps.document ?? document;
	const scheduler = createScheduler({
		run: async () => {
			const result = await deps.run(store.getState().log);
			store.adopt(result.log, result.status);
			return result.nextAt;
		},
		now: deps.now,
		setTimer: deps.setTimer,
		clearTimer: deps.clearTimer
	});
	const offRecorded = store.onRecorded(() => scheduler.answered());
	const online = () => void scheduler.online();
	const visible = () => {
		if (doc.visibilityState === "visible") void scheduler.visible();
	};
	target.addEventListener("online", online);
	doc.addEventListener("visibilitychange", visible);
	void scheduler.visible();
	return () => {
		scheduler.stop();
		offRecorded();
		target.removeEventListener("online", online);
		doc.removeEventListener("visibilitychange", visible);
	};
}

const roundsStore = createStore<{ running: number }>()(() => ({ running: 0 }));

/** True while any sync round is in flight, whoever started it. */
export const syncRunning = {
	subscribe: roundsStore.subscribe,
	get: () => roundsStore.getState().running > 0
};

export async function trackRound<T>(work: () => Promise<T>): Promise<T> {
	roundsStore.setState((state) => ({ running: state.running + 1 }));
	try {
		return await work();
	} finally {
		roundsStore.setState((state) => ({ running: state.running - 1 }));
	}
}

export const liveSync =
	(
		store: AppStore,
		client: SupabaseClient,
		retryAfter: () => number | null
	): StartSyncDeps["run"] =>
	(log) =>
		trackRound(() =>
			syncNow(
				store.db,
				client,
				{ now: Date.now(), random: Math.random, online: navigator.onLine, retryAfter },
				log,
				store.bundle
			)
		);
