import { uuidV7 } from "@/core/session/ids";
import { readMeta, type TerkaDb } from "./schema";

// Cut on code points, like char_length on the server, so an emoji is never split in half.
const cut = (text: string, max: number) => [...text].slice(0, max).join("");

export async function ensureDevice(
	db: TerkaDb,
	input: { now: number; random: () => number; label: string; platform: string }
): Promise<string> {
	return db.transaction("rw", [db.sync_meta, db.devices, db.outbox], async () => {
		const existing = await readMeta<string>(db, "deviceId");
		if (existing) return existing;
		const id = uuidV7(input.now, input.random);
		await db.sync_meta.put({ key: "deviceId", value: id });
		await db.devices.put({
			id,
			label: cut(input.label, 40),
			platform: cut(input.platform, 200),
			createdAt: input.now,
			lastSeenAt: null
		});
		await db.outbox.add({ table: "devices", key: id, op: "insert" });
		return id;
	});
}

type Persistence = Pick<StorageManager, "persist" | "persisted">;

// A refusal is not an error: the app keeps working and the screen leans on login instead.
export async function ensurePersistence(
	storage: Persistence | undefined = globalThis.navigator?.storage
): Promise<boolean> {
	if (!storage) return false;
	if (await storage.persisted()) return true;
	return storage.persist();
}

/** A device of the account as the account screen needs it. */
export type DeviceInfo = {
	id: string;
	label: string;
	platform: string;
	lastSeenAt: number | null;
	removedAt: number | null;
};

const stamp = (value: unknown) => (typeof value === "string" ? Date.parse(value) : null);

export const deviceInfoOf = (row: Record<string, unknown>): DeviceInfo => ({
	id: String(row.id),
	label: String(row.label),
	platform: String(row.platform),
	lastSeenAt: stamp(row.last_seen_at),
	removedAt: stamp(row.removed_at)
});

/**
 * The account's devices as the last pull saw them, plus this one from its own row: before any pull,
 * or when the server has not registered it (a device limit), it is still on the list.
 */
export async function listDevices(db: TerkaDb): Promise<DeviceInfo[]> {
	const pulled = (await readMeta<DeviceInfo[]>(db, "deviceList")) ?? [];
	const ownId = await readMeta<string>(db, "deviceId");
	const local = (await db.devices.toArray()).map((row): DeviceInfo => ({
		id: row.id,
		label: row.label,
		platform: row.platform,
		lastSeenAt: row.lastSeenAt,
		removedAt: null
	}));
	const own = local.find((device) => device.id === ownId);
	return own && !pulled.some((device) => device.id === own.id)
		? [...pulled, own]
		: pulled.length
			? pulled
			: local;
}
