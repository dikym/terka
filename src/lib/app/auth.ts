import type { SupabaseClient } from "@supabase/supabase-js";
import { createStore } from "zustand/vanilla";
import { createTerkaClient } from "@/lib/auth/client";
import { checkRemoved, leaveRemovedDevice, sessionIdOf } from "@/lib/auth/removal";
import { readMeta, type TerkaDb } from "@/lib/db/schema";
import { type SyncSignal, syncSignal } from "@/lib/sync/signal";
import { showToast } from "@/lib/toasts";
import { syncLabel } from "@/lib/view/sync-label";
import { liveSync, startSync } from "@/lib/app/sync";
import type { Runtime } from "@/lib/app/runtime";

export type AccountState = {
	/** False until the stored session has been read, so screens do not flash the sign-in card. */
	known: boolean;
	email: string | null;
	provider: "google" | "email" | null;
};

export const account = createStore<AccountState>()(() => ({
	known: false,
	email: null,
	provider: null
}));

let client: ReturnType<typeof createTerkaClient> | null | undefined;

type AuthClient = { client: SupabaseClient; retryAfter: () => number | null } | null;

/** Null when the build has no Supabase project configured; the app then runs without accounts. */
export function authClient(): AuthClient {
	if (client !== undefined) return client;
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	try {
		client = url && key ? createTerkaClient(url, key) : null;
	} catch {
		// A malformed project URL must not stop practice; the app then runs without accounts.
		client = null;
	}
	return client;
}

const started = new WeakSet<Runtime>();
// The nudge channel of the signed-in account, shared with rounds started by hand.
let signal: SyncSignal | null = null;

// Sync runs only while a session exists: without one syncNow reports the session as ended.
export function startAuth(
	runtime: Runtime,
	{ signingIn = false, auth = authClient() }: { signingIn?: boolean; auth?: AuthClient } = {}
) {
	if (started.has(runtime)) return;
	started.add(runtime);
	if (!auth) {
		account.setState({ known: true });
		return;
	}
	// The open-time check, the auth listener and a sync round may each find one removal.
	let told = false;
	const notify = (text: string) => {
		if (told) return;
		told = true;
		showToast({ tone: "warn", label: "Sinkronisasi", text, key: "sync" });
	};
	runtime.store.subscribe(({ sync }, previous) => {
		if (sync?.state === "removed" && previous.sync?.state !== "removed") notify(REMOVED);
	});
	const leave = { db: runtime.db, client: auth.client, reload: runtime.reload, notify };
	// Before the callback exchanges its code there is no session, so the check would ask about the old one.
	if (!signingIn)
		void settleOnOpen({
			...leave,
			online: navigator.onLine,
			signedIn: runtime.signedInAtOpen
		});
	let stop: (() => void) | null = null;
	auth.client.auth.onAuthStateChange((_event, session) => {
		const user = session?.user ?? null;
		const provider = user?.app_metadata.provider;
		account.setState({
			known: true,
			email: user?.email ?? null,
			provider: provider === "google" ? "google" : user ? "email" : null
		});
		if (user && !stop) {
			told = false;
			signal = syncSignal(auth.client, user.id);
			stop = startSync(runtime.store, {
				run: liveSync(runtime.store, auth.client, auth.retryAfter),
				afterRound: runtime.refreshPrefs,
				signal,
				now: Date.now,
				setTimer: (callback, ms) => setTimeout(callback, ms),
				clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
			});
		}
		if (!user && stop) {
			stop();
			stop = null;
			signal = null;
			// auth-js drops a revoked session itself when a refresh fails, and no round runs after that.
			void readMeta<string>(runtime.db, "ownerUserId")
				.then((owner) => (owner ? leaveIfRemoved(leave) : undefined))
				.catch(() => {});
		}
	});
}

/** One sync round now: by hand, right after sign-in, and for "Sinkronkan dulu" before signing out. */
export async function syncOnce(runtime: Runtime): Promise<void> {
	const auth = authClient();
	if (!auth) return;
	const result = await liveSync(
		runtime.store,
		auth.client,
		auth.retryAfter
	)(runtime.store.getState().log);
	runtime.store.adopt(result.log, result.status);
	if (result.sent > 0) signal?.announce();
	await runtime.refreshPrefs();
}

/** Tells the account's other devices to sync, after a change made outside a sync round. */
export function announceChange(): void {
	signal?.announce();
}

const settlingStore = createStore<{ active: boolean }>()(() => ({ active: false }));

/** True while the first round after sign-in runs; screens read nothing from the log until it ends. */
export const settling = {
	subscribe: settlingStore.subscribe,
	get: () => settlingStore.getState().active
};

/**
 * The first round after sign-in. The sign-in event fires before the device's data is claimed, so
 * the round it starts has nothing to do; without this one the next screen shows what the device
 * held before until something else triggers a sync. Start it, then leave the sign-in page: screens
 * show their own loading state while it runs. A slow network ends the wait, not the sign-in.
 */
export async function settleAfterSignIn(
	sync: Promise<unknown>,
	reload: () => Promise<void>,
	limitMs = 15_000
): Promise<void> {
	settlingStore.setState({ active: true });
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const limit = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, limitMs);
		});
		await Promise.race([sync.catch(() => {}), limit]);
		await reload();
	} finally {
		clearTimeout(timer);
		settlingStore.setState({ active: false });
	}
}

type Leave = {
	db: TerkaDb;
	client: SupabaseClient;
	reload: () => Promise<void>;
	notify: (text: string) => void;
};

const REMOVED = syncLabel({ state: "removed", quarantined: 0, lastSyncAt: null }, true, 0);

async function leaveIfRemoved(deps: Leave, sessionId?: string | null): Promise<void> {
	if ((await checkRemoved(deps.db, deps.client, sessionId)) !== "removed") return;
	await leaveRemovedDevice(deps.db, deps.client);
	await deps.reload();
	deps.notify(REMOVED);
}

/**
 * A device removed elsewhere while it was closed leaves before its first screen. The screens wait
 * for the answer only up to the limit; a removal that answers later still signs the device out.
 */
export async function settleOnOpen({
	online,
	signedIn,
	limitMs = 3_000,
	...deps
}: Leave & { online: boolean; signedIn: boolean; limitMs?: number }): Promise<void> {
	if (!online) return;
	// A guest has nothing to check, so its screens never blank out while it opens.
	if (!signedIn) return;
	// No await before this line: the browser could paint the screens in that gap, then blank them.
	settlingStore.setState({ active: true });
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const limit = new Promise<void>((resolve) => {
			timer = setTimeout(resolve, limitMs);
		});
		const check = (async () => {
			const { data } = await deps.client.auth.getSession();
			await leaveIfRemoved(deps, sessionIdOf(data.session?.access_token));
		})();
		await Promise.race([check.catch(() => {}), limit]);
	} finally {
		clearTimeout(timer);
		settlingStore.setState({ active: false });
	}
}
