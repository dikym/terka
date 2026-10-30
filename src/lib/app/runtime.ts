import { createStore } from "zustand/vanilla";
import { buildDictionary, type NameDictionary } from "@/core/answers/dictionary";
import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import type { LastDay } from "@/core/session/commands";
import type { SessionContext, SessionSettings } from "@/core/session/context";
import { loadState } from "../db/log";
import { loadNotes, loadSettings, saveNote, saveSettings } from "../db/settings";
import type { TerkaDb } from "../db/schema";
import { type BootDeps, openApp } from "./boot";
import { type AppStore, createAppStore } from "./store";

export type PrefsState = { settings: SessionSettings; notes: Map<string, string> };

export type Runtime = {
	db: TerkaDb;
	bundle: Bundle;
	deviceId: string;
	persisted: boolean;
	outdated: boolean;
	store: AppStore;
	dictionary: NameDictionary;
	prefs: ReturnType<typeof createPrefs>;
	saveSettings: (settings: SessionSettings) => Promise<"ok" | "quota">;
	saveNote: (contentId: string, body: string) => Promise<"ok" | "quota">;
	/** Reads the log, settings and notes again after an import or a wipe. */
	reload: () => Promise<void>;
	/** Reads settings and notes again after a sync round; screens re-render only if they changed. */
	refreshPrefs: () => Promise<void>;
};

export type RuntimeStatus =
	| { status: "loading" }
	| { status: "contentFailed" }
	| { status: "storageFailed" }
	| { status: "ready"; runtime: Runtime };

const createPrefs = (initial: PrefsState) => createStore<PrefsState>()(() => initial);

const sameSettings = (a: SessionSettings, b: SessionSettings) =>
	a.specialEnabled === b.specialEnabled &&
	a.scope.level === b.scope.level &&
	a.scope.id === b.scope.id;
const sameNotes = (a: Map<string, string>, b: Map<string, string>) =>
	a.size === b.size && [...a].every(([id, body]) => b.get(id) === body);

const LOADING: RuntimeStatus = { status: "loading" };
let current: RuntimeStatus = LOADING;
let booting: Promise<RuntimeStatus> | null = null;
const listeners = new Set<() => void>();

const browserDeps = (): BootDeps => ({
	now: Date.now,
	random: Math.random,
	userAgent: navigator.userAgent
});

async function open(deps: BootDeps): Promise<RuntimeStatus> {
	const boot = await openApp(deps);
	if (boot.status === "contentFailed" || boot.status === "storageFailed") return boot;
	// An outdated log without a cached state cannot be practised on; treat it like unreadable storage.
	if (!boot.log) return { status: "storageFailed" };
	const { db, bundle, deviceId } = boot;
	const store = createAppStore({ db, bundle, log: boot.log });
	const prefs = createPrefs({ settings: await loadSettings(db), notes: await loadNotes(db) });
	const writer = () => ({ now: Date.now(), deviceId });
	const runtime: Runtime = {
		db,
		bundle,
		deviceId,
		persisted: boot.persisted,
		outdated: boot.status === "outdated",
		store,
		dictionary: buildDictionary(bundle),
		prefs,
		async saveSettings(settings) {
			const result = await saveSettings(db, settings, writer());
			if (result.status === "ok") prefs.setState({ settings });
			return result.status;
		},
		async saveNote(contentId, body) {
			const result = await saveNote(db, contentId, body, writer());
			if (result.status === "ok") {
				const notes = new Map(prefs.getState().notes);
				if (body === "") notes.delete(contentId);
				else notes.set(contentId, body);
				prefs.setState({ notes });
			}
			return result.status;
		},
		async reload() {
			const loaded = await loadState(db, bundle);
			if (loaded.log) store.adopt(loaded.log, store.getState().sync);
			prefs.setState({ settings: await loadSettings(db), notes: await loadNotes(db) });
		},
		async refreshPrefs() {
			const settings = await loadSettings(db);
			const notes = await loadNotes(db);
			const current = prefs.getState();
			if (!sameSettings(current.settings, settings)) prefs.setState({ settings });
			if (!sameNotes(current.notes, notes)) prefs.setState({ notes });
		}
	};
	return { status: "ready", runtime };
}

/** Opens the app once per page load; every screen shares the result. */
export function bootRuntime(deps?: BootDeps): Promise<RuntimeStatus> {
	booting ??= open(deps ?? browserDeps())
		.catch((): RuntimeStatus => ({ status: "storageFailed" }))
		.then((status) => {
			current = status;
			for (const listener of listeners) listener();
			return status;
		});
	return booting;
}

export function resetRuntime() {
	current = LOADING;
	booting = null;
}

export const runtimeSnapshot = () => current;
export const loadingSnapshot = () => LOADING;
export function subscribeRuntime(listener: () => void) {
	listeners.add(listener);
	return () => void listeners.delete(listener);
}

export const sessionCtx = (runtime: Pick<Runtime, "deviceId">): SessionContext => ({
	now: Date.now(),
	tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
	deviceId: runtime.deviceId,
	random: Math.random
});

// Keeps a new event's local day from moving back after a time zone change.
export const lastDayOf = (state: AppState): LastDay | undefined =>
	state.currentDay !== null && state.lastTz !== null
		? { localDay: state.currentDay, tz: state.lastTz }
		: undefined;
