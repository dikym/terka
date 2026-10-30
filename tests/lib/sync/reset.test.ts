import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { seeded } from "../../../src/core/random";
import { ensureDevice } from "../../../src/lib/db/device";
import { loadState, record } from "../../../src/lib/db/log";
import { readMeta } from "../../../src/lib/db/schema";
import { adoptServerReset } from "../../../src/lib/sync/reset";
import { review, ruleBundle } from "../../core/replay/fixtures";
import { freshDb, withUuids } from "../db/fixtures";

const NOW = Date.parse("2026-10-30T08:00:00Z");

const serverAt = (epoch: number | null) =>
	({
		from: () => ({
			select: () => ({
				retry: async () => ({
					data: epoch === null ? [] : [{ epoch }],
					error: null,
					status: 200
				})
			})
		})
	}) as unknown as SupabaseClient;

const failing = (status: number) =>
	({
		from: () => ({
			select: () => ({
				retry: async () => ({ data: null, error: { message: "x" }, status })
			})
		})
	}) as unknown as SupabaseClient;

async function holding(meta: Record<string, unknown>) {
	const db = freshDb();
	await ensureDevice(db, {
		now: NOW,
		random: seeded("reset"),
		label: "Laptop",
		platform: "test"
	});
	const loaded = await loadState(db, ruleBundle());
	if (loaded.status !== "ok") throw new Error("expected a usable state");
	await record(db, loaded.log, withUuids([review("dk", "code2region", NOW)]), ruleBundle());
	for (const [key, value] of Object.entries(meta)) await db.sync_meta.put({ key, value });
	return db;
}

describe("adopting a reset made on another device", () => {
	test("a higher counter drops what the device holds, including rows waiting to be sent", async () => {
		const db = await holding({ resetEpoch: 1, lastSyncAt: NOW });
		expect(await adoptServerReset(db, serverAt(2), NOW)).toEqual({ action: null, wiped: true });
		expect(await db.review_logs.count()).toBe(0);
		expect((await db.outbox.toArray()).filter((item) => item.table === "review_logs")).toEqual(
			[]
		);
		expect(await readMeta<number>(db, "resetEpoch")).toBe(2);
	});
	test("the same counter changes nothing", async () => {
		const db = await holding({ resetEpoch: 2, lastSyncAt: NOW });
		expect(await adoptServerReset(db, serverAt(2), NOW)).toEqual({
			action: null,
			wiped: false
		});
		expect(await db.review_logs.count()).toBe(1);
	});
	test("a device that synced before resets existed drops its data when the account was reset", async () => {
		const db = await holding({ lastSyncAt: NOW });
		expect((await adoptServerReset(db, serverAt(1), NOW)).wiped).toBe(true);
		expect(await db.review_logs.count()).toBe(0);
	});
	test("a device that never synced keeps its data and takes over the counter", async () => {
		const db = await holding({});
		expect(await adoptServerReset(db, serverAt(3), NOW)).toEqual({
			action: null,
			wiped: false
		});
		expect(await db.review_logs.count()).toBe(1);
		expect(await readMeta<number>(db, "resetEpoch")).toBe(3);
	});
	test("an account that never reset counts as zero", async () => {
		const db = await holding({ lastSyncAt: NOW });
		expect(await adoptServerReset(db, serverAt(null), NOW)).toEqual({
			action: null,
			wiped: false
		});
		expect(await db.review_logs.count()).toBe(1);
	});
	test("a failed read keeps the data and asks for a retry", async () => {
		const db = await holding({ resetEpoch: 1, lastSyncAt: NOW });
		expect(await adoptServerReset(db, failing(503), NOW)).toEqual({
			action: { kind: "retry" },
			wiped: false
		});
		expect(await db.review_logs.count()).toBe(1);
	});
});
