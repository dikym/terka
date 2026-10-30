import { EVENT_TABLES, readMeta, wipesOf, type TableName, type TerkaDb } from "./schema";

const PROGRESS_TABLES: TableName[] = [...EVENT_TABLES, "card_notes", "user_settings"];

/**
 * Drops everything learned on this device and keeps what belongs to the device and the account:
 * its id and row, consents, the owner and the device list. `epoch` is the server's reset counter
 * this wipe answers to; without it the device is a guest or the reset came from here.
 */
export async function wipeProgress(db: TerkaDb, epoch?: number): Promise<void> {
	await db.transaction("rw", db.tables, async () => {
		// Both counters only grow: other tabs' log states and running sync rounds see the wipe.
		const logVersion = ((await readMeta<number>(db, "logVersion")) ?? 0) + 1;
		const wipes = (await wipesOf(db)) + 1;
		for (const table of PROGRESS_TABLES) await db.table(table).clear();
		await db.derived.clear();
		await db.ui_flags.clear();
		await db.outbox.filter((item) => PROGRESS_TABLES.includes(item.table)).delete();
		await db.outbox_quarantine.filter((item) => PROGRESS_TABLES.includes(item.table)).delete();
		await db.sync_meta.bulkDelete(["pullHistory", "claim"]);
		await db.sync_meta.bulkPut([
			{ key: "logVersion", value: logVersion },
			{ key: "wipes", value: wipes },
			...(epoch === undefined ? [] : [{ key: "resetEpoch", value: epoch }])
		]);
	});
}
