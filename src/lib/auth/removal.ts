import type { SupabaseClient } from "@supabase/supabase-js";
import { wipeLocalData } from "@/lib/auth/account";
import { readMeta, type TerkaDb } from "@/lib/db/schema";

export type Removal = "removed" | "kept" | "unknown";

// Only the id is read, never trusted: the server checks the token's signature on every request.
export function sessionIdOf(accessToken: string | undefined): string | null {
	try {
		const payload = accessToken?.split(".")[1];
		if (!payload) return null;
		const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
		return typeof claims?.session_id === "string" && claims.session_id
			? claims.session_id
			: null;
	} catch {
		return null;
	}
}

// Kept so a device whose session is already gone can still ask whether it was removed.
export async function rememberSession(
	db: TerkaDb,
	accessToken: string | undefined
): Promise<string | null> {
	const id = sessionIdOf(accessToken);
	if (!id) return (await readMeta<string>(db, "sessionId")) ?? null;
	await db.sync_meta.put({ key: "sessionId", value: id });
	return id;
}

export async function checkRemoved(
	db: TerkaDb,
	client: SupabaseClient,
	sessionId?: string | null
): Promise<Removal> {
	const session = sessionId ?? (await readMeta<string>(db, "sessionId"));
	if (!session) return "unknown";
	try {
		// Only a strict true wipes data: an error or a missing function also leaves data empty.
		const { data } = await client.rpc("session_removed", { session });
		if (data === false) return "kept";
		if (data !== true) return "unknown";
		// The answer is about the session asked for; a sign-in since then has a session of its own.
		const now = await client.auth.getSession();
		const current = sessionIdOf(now.data.session?.access_token);
		return current && current !== session ? "kept" : "removed";
	} catch {
		return "unknown";
	}
}

const leaving = new WeakMap<TerkaDb, Promise<void>>();

// A sync round and the open-time check may both find the removal; the device leaves once.
export function leaveRemovedDevice(db: TerkaDb, client: SupabaseClient): Promise<void> {
	let pending = leaving.get(db);
	if (!pending) {
		pending = (async () => {
			await client.auth.signOut({ scope: "local" }).catch(() => undefined);
			await wipeLocalData(db);
		})().finally(() => leaving.delete(db));
		leaving.set(db, pending);
	}
	return pending;
}
