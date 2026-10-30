import type { SupabaseClient } from "@supabase/supabase-js";
import { wipeProgress } from "@/lib/db/reset";
import { readMeta, type TerkaDb } from "@/lib/db/schema";
import { classify, type Action } from "./errors";

/**
 * Compares the server's reset counter with this device's. A higher one means the account's progress
 * was reset elsewhere, so what this device holds, including rows waiting to be sent, is dropped
 * before it can reach the server again. A device that never synced has nothing the server has seen
 * and only takes over the counter.
 */
export async function adoptServerReset(
	db: TerkaDb,
	client: SupabaseClient,
	now: number
): Promise<{ action: Action | null; wiped: boolean }> {
	const response = await client.from("progress_resets").select("epoch").retry(false);
	if (response.error)
		return {
			action: classify({ status: response.status, ...response.error }, "user_settings", now),
			wiped: false
		};
	const server = (response.data[0]?.epoch as number | undefined) ?? 0;
	const stored = await readMeta<number>(db, "resetEpoch");
	const synced = (await readMeta<number>(db, "lastSyncAt")) !== undefined;
	const local = stored ?? (synced ? 0 : server);
	if (server > local) {
		await wipeProgress(db, server);
		return { action: null, wiped: true };
	}
	if (stored !== server) await db.sync_meta.put({ key: "resetEpoch", value: server });
	return { action: null, wiped: false };
}
