import type { SupabaseClient } from "@supabase/supabase-js";
import { createStore } from "zustand/vanilla";
import { createTerkaClient } from "../auth/client";
import { liveSync, startSync } from "./sync";
import type { Runtime } from "./runtime";

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

/** Null when the build has no Supabase project configured; the app then runs without accounts. */
export function authClient(): { client: SupabaseClient; retryAfter: () => number | null } | null {
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

let started = false;

// Sync runs only while a session exists: without one syncNow reports the session as ended.
export function startAuth(runtime: Runtime) {
	if (started) return;
	started = true;
	const auth = authClient();
	if (!auth) {
		account.setState({ known: true });
		return;
	}
	let stop: (() => void) | null = null;
	auth.client.auth.onAuthStateChange((_event, session) => {
		const user = session?.user ?? null;
		const provider = user?.app_metadata.provider;
		account.setState({
			known: true,
			email: user?.email ?? null,
			provider: provider === "google" ? "google" : user ? "email" : null
		});
		if (user && !stop)
			stop = startSync(runtime.store, {
				run: liveSync(runtime.store, auth.client, auth.retryAfter),
				now: Date.now,
				setTimer: (callback, ms) => setTimeout(callback, ms),
				clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>)
			});
		if (!user && stop) {
			stop();
			stop = null;
		}
	});
}

/** One sync round now, for "Sinkronkan dulu" before signing out. */
export async function syncOnce(runtime: Runtime): Promise<void> {
	const auth = authClient();
	if (!auth) return;
	const result = await liveSync(
		runtime.store,
		auth.client,
		auth.retryAfter
	)(runtime.store.getState().log);
	runtime.store.adopt(result.log, result.status);
}
