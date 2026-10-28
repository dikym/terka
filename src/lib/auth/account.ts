import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeviceInfo } from "@/lib/db/device";
import { readMeta, wipesOf, type TerkaDb } from "@/lib/db/schema";

export async function claimLocalData(
	db: TerkaDb,
	userId: string
): Promise<{ status: "ok"; answers: number } | { status: "otherAccount" }> {
	return db.transaction("rw", [db.sync_meta, db.outbox, db.review_logs], async () => {
		const owner = await readMeta<string>(db, "ownerUserId");
		if (owner && owner !== userId) return { status: "otherAccount" as const };
		if (owner === userId) return { status: "ok" as const, answers: 0 };
		await db.sync_meta.put({ key: "ownerUserId", value: userId });
		const answers = await db.review_logs.count();
		await db.sync_meta.put({ key: "claim", value: { total: answers } });
		// The device row is per account on the server; resending it to a new owner is harmless.
		const deviceId = await readMeta<string>(db, "deviceId");
		if (deviceId) await db.outbox.add({ table: "devices", key: deviceId, op: "insert" });
		return { status: "ok" as const, answers };
	});
}

// The device keeps its id across sign-ins, so its id and its own device row stay.
export async function wipeLocalData(db: TerkaDb): Promise<void> {
	await db.transaction("rw", db.tables, async () => {
		const deviceId = await readMeta<string>(db, "deviceId");
		const device = deviceId ? await db.devices.get(deviceId) : undefined;
		// Both counters only grow: other tabs' log states and running sync rounds see the wipe.
		const logVersion = ((await readMeta<number>(db, "logVersion")) ?? 0) + 1;
		const wipes = (await wipesOf(db)) + 1;
		for (const table of db.tables) await table.clear();
		await db.sync_meta.bulkPut([
			{ key: "logVersion", value: logVersion },
			{ key: "wipes", value: wipes }
		]);
		if (deviceId) await db.sync_meta.put({ key: "deviceId", value: deviceId });
		if (device) await db.devices.put(device);
	});
}

export async function signOut(
	db: TerkaDb,
	client: SupabaseClient,
	options: { confirmed: boolean }
): Promise<{ status: "ok" } | { status: "pending"; count: number }> {
	const count = await db.outbox.count();
	if (count > 0 && !options.confirmed) return { status: "pending", count };
	await client.auth.signOut({ scope: "local" });
	await wipeLocalData(db);
	return { status: "ok" };
}

// The deleted account still owns what is on this device, so none of it is ever sent again.
export async function deleteAccount(
	db: TerkaDb,
	client: SupabaseClient
): Promise<{ status: "ok" } | { status: "failed" }> {
	const { error } = await client.rpc("delete_user");
	if (error) return { status: "failed" };
	await client.auth.signOut({ scope: "local" });
	return { status: "ok" };
}

/**
 * Takes another device off the account's list. The row stays on the server, marked, because its
 * sessions and answers still point at it; a device that is really in use clears the mark again.
 */
export async function removeDevice(
	db: TerkaDb,
	client: SupabaseClient,
	id: string,
	now: number
): Promise<{ status: "ok" } | { status: "failed" }> {
	if (id === (await readMeta<string>(db, "deviceId"))) return { status: "failed" };
	const response = await client
		.from("devices")
		.update({ removed_at: new Date(now).toISOString() })
		.eq("id", id)
		.select("id");
	if (response.error || !response.data?.length) return { status: "failed" };
	const list = (await readMeta<DeviceInfo[]>(db, "deviceList")) ?? [];
	await db.sync_meta.put({
		key: "deviceList",
		value: list.map((device) => (device.id === id ? { ...device, removedAt: now } : device))
	});
	return { status: "ok" };
}
