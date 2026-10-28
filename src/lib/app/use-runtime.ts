"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { StoreApi } from "zustand/vanilla";
import { account, settling, startAuth } from "./auth";
import {
	bootRuntime,
	loadingSnapshot,
	type PrefsState,
	type Runtime,
	runtimeSnapshot,
	subscribeRuntime
} from "./runtime";
import { syncRunning } from "./sync";
import { lastSyncLabel, type SyncIcon, syncIcon, syncLabel } from "../view/sync-label";
import type { AppState } from "./store";

/** The shared runtime; the static export and the first client render see "loading". */
export function useRuntime() {
	const status = useSyncExternalStore(subscribeRuntime, runtimeSnapshot, loadingSnapshot);
	useEffect(() => {
		void bootRuntime().then((booted) => {
			if (booted.status === "ready") startAuth(booted.runtime);
		});
	}, []);
	return status;
}

const noop = () => () => {};

function useStore<T>(store: StoreApi<T> | null): T | null {
	return useSyncExternalStore(
		store ? store.subscribe : noop,
		() => (store ? store.getState() : null),
		() => null
	);
}

/** True while any sync round is running. */
export const useSyncRunning = () =>
	useSyncExternalStore(syncRunning.subscribe, syncRunning.get, () => false);

export const useSettling = () =>
	useSyncExternalStore(settling.subscribe, settling.get, () => false);

/** The log and sync status; null while the app is still opening or settling after sign-in. */
export function useAppState(runtime: Runtime | null): AppState | null {
	const state = useStore(runtime?.store ?? null);
	return useSettling() ? null : state;
}

export const usePrefs = (runtime: Runtime | null): PrefsState | null =>
	useStore(runtime?.prefs ?? null);

export const useAccount = () =>
	useSyncExternalStore(account.subscribe, account.getState, account.getState);

/** The ready runtime, or null while loading or after a failure. */
export function useReady() {
	const status = useRuntime();
	return { status, runtime: status.status === "ready" ? status.runtime : null };
}

// One clock for relative times ("3 menit lalu"), read every 30 seconds while someone shows it.
let now = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | null = null;
function subscribeClock(listener: () => void) {
	clockListeners.add(listener);
	if (!clockTimer) {
		now = Date.now();
		clockTimer = setInterval(() => {
			now = Date.now();
			for (const each of clockListeners) each();
		}, 30_000);
	}
	return () => {
		clockListeners.delete(listener);
		if (!clockListeners.size && clockTimer) {
			clearInterval(clockTimer);
			clockTimer = null;
		}
	};
}
const clockSnapshot = () => now;

/** The current time, for labels that may lag up to 30 seconds; 0 before hydration. */
export const useNow = () => useSyncExternalStore(subscribeClock, clockSnapshot, () => 0);

/** The sync line for the chip and the phone header; null while the app opens. */
export function useSyncLabel(runtime: Runtime | null, syncing = false): string | null {
	const app = useAppState(runtime);
	const { known, email } = useAccount();
	const at = useNow();
	if (!app || !known || at === 0) return null;
	return syncLabel(app.sync, email !== null, at, syncing);
}

/** The cloud icon for the sync status; `syncing` marks a sync the person just started. */
export function useSyncIcon(runtime: Runtime | null, syncing = false): SyncIcon {
	const app = useAppState(runtime);
	const { known, email } = useAccount();
	if (!app || !known) return "cloud-check";
	return syncIcon(app.sync, email !== null, syncing);
}

/** When the last sync finished; null while the app opens. */
export function useLastSyncLabel(runtime: Runtime | null): string | null {
	const app = useAppState(runtime);
	const at = useNow();
	if (!app || at === 0) return null;
	return lastSyncLabel(app.sync, at);
}
