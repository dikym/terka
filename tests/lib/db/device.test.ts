import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { ensureDevice, ensurePersistence } from "../../../src/lib/db/device";
import { readMeta } from "../../../src/lib/db/schema";
import { freshDb } from "./fixtures";

const NOW = Date.parse("2026-10-03T08:00:00Z");
const device = {
	now: NOW,
	random: seeded("device"),
	label: "x".repeat(50),
	platform: "y".repeat(250)
};

describe("device", () => {
	test("the first open creates one device row, its outbox item and the stored id", async () => {
		const db = freshDb();
		const id = await ensureDevice(db, device);
		expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
		expect(await readMeta<string>(db, "deviceId")).toBe(id);
		expect(await db.devices.get(id)).toEqual({
			id,
			label: "x".repeat(40),
			platform: "y".repeat(200),
			createdAt: NOW,
			lastSeenAt: null
		});
		expect(await db.outbox.toArray()).toEqual([
			{ seq: 1, table: "devices", key: id, op: "insert" }
		]);
	});
	test("a label is cut on whole characters, never inside an emoji", async () => {
		const db = freshDb();
		const id = await ensureDevice(db, { ...device, label: `${"a".repeat(39)}🚗🚗` });
		expect((await db.devices.get(id))?.label).toBe(`${"a".repeat(39)}🚗`);
	});
	test("later opens keep the same id and add nothing", async () => {
		const db = freshDb();
		const id = await ensureDevice(db, device);
		expect(await ensureDevice(db, { ...device, random: seeded("other") })).toBe(id);
		expect(await db.devices.count()).toBe(1);
		expect(await db.outbox.count()).toBe(1);
	});
});

describe("persistence", () => {
	const storage = (persisted: boolean, granted: boolean) => {
		const calls: string[] = [];
		return {
			calls,
			persisted: async () => (calls.push("persisted"), persisted),
			persist: async () => (calls.push("persist"), granted)
		};
	};
	test("asks once when storage is not persisted yet and reports the answer", async () => {
		const refused = storage(false, false);
		expect(await ensurePersistence(refused)).toBe(false);
		expect(refused.calls).toEqual(["persisted", "persist"]);
		expect(await ensurePersistence(storage(false, true))).toBe(true);
	});
	test("does not ask again when storage is already persisted", async () => {
		const done = storage(true, false);
		expect(await ensurePersistence(done)).toBe(true);
		expect(done.calls).toEqual(["persisted"]);
	});
	test("a browser without the storage API reports false", async () => {
		expect(await ensurePersistence(undefined)).toBe(false);
	});
});
