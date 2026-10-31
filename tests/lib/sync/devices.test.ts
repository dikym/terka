import { describe, expect, test } from "bun:test";
import { LEAVE_WAIT_MS, removeDevice, signOut } from "../../../src/lib/auth/account";
import { createAppStore } from "../../../src/lib/app/store";
import { listDevices } from "../../../src/lib/db/device";
import { readMeta, wipesOf } from "../../../src/lib/db/schema";
import type { SyncStatus } from "../../../src/lib/sync/status";
import { syncNow, type SyncResult } from "../../../src/lib/sync/sync";
import { deviceRows } from "../../../src/lib/view/account";
import { openDevice, type Device } from "./support/device";
import { answersOf, DAY, HOUR, MINUTE, NOW, openRun, review } from "./support/events";
import { snapshot } from "../../core/replay/fixtures";
import { FakeServer } from "./support/server";
import { pair, trio } from "./support/world";

const listed = async (device: Awaited<ReturnType<typeof pair>>["a"]) =>
	deviceRows(await listDevices(device.db), device.id, device.now()).map((row) => row.id);

describe("the devices of an account", () => {
	test("each device sees the others after a round", async () => {
		const { a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		expect((await listDevices(a.db)).map((device) => device.id).sort()).toEqual(
			[a.id, b.id].sort()
		);
		expect(await listed(a)).toEqual([a.id, b.id]);
	});

	test("lists only this device before the first pull", async () => {
		const { a } = await pair();
		expect(await listed(a)).toEqual([a.id]);
	});

	test("keeps this device on the list when the server has not registered it", async () => {
		const { server, a } = await pair();
		server.limits.devices = 0;
		await a.sync();
		expect(server.ids("devices")).toEqual([]);
		expect(await listed(a)).toEqual([a.id]);
	});

	test("takes the time a device was last seen from the server", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		server.clock.now += 3 * HOUR;
		await b.sync();
		await a.sync();
		const seen = (await listDevices(a.db)).find((device) => device.id === b.id)?.lastSeenAt;
		expect(seen).toBe(server.clock.now);
	});

	test("stops listing a device that has not been seen for a week", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		server.clock.now += 8 * DAY;
		await a.sync();
		expect(await listed(a)).toEqual([a.id]);
	});

	test("keeps this device in the list however long ago it was seen", async () => {
		const { server, a } = await pair();
		await a.sync();
		server.clock.now += 30 * DAY;
		expect(await listed(a)).toEqual([a.id]);
	});
});

describe("removing a device", () => {
	test("marks it on the server and drops it from the list", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		const result = await removeDevice(a.db, a.client, b.id, a.now());
		expect(result).toEqual({ status: "ok" });
		expect(server.rowOf("devices", b.id)?.removed_at).not.toBeNull();
		expect(server.rowOf("devices", b.id)?.removal_reason).toBe("removed");
		expect(await listed(a)).toEqual([a.id]);
	});

	test("shows as removed on the other devices after they pull", async () => {
		const { a, b, c } = await trio();
		for (const device of [a, b, c, a]) await device.sync();
		await removeDevice(a.db, a.client, c.id, a.now());
		await b.sync();
		expect(await listed(b)).toEqual([b.id, a.id]);
		expect(await listed(b)).not.toContain(c.id);
	});

	test("never removes the device that asks", async () => {
		const { server, a } = await pair();
		await a.sync();
		const result = await removeDevice(a.db, a.client, a.id, a.now());
		expect(result).toEqual({ status: "failed" });
		expect(server.rowOf("devices", a.id)?.removed_at).toBeNull();
	});

	test("keeps its sessions and answers", async () => {
		const { server, a, b } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await b.record(daily);
		await b.record(...answersOf(daily, ["ba"], NOW));
		await b.sync();
		await a.sync();
		await removeDevice(a.db, a.client, b.id, a.now());
		expect(server.rows("review_logs")).toHaveLength(1);
		expect(server.rowOf("devices", b.id)).toBeDefined();
	});

	test("revokes the removed device's session", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		await removeDevice(a.db, a.client, b.id, a.now());
		expect(server.revoked.has(b.auth.sessionId!)).toBe(true);
		expect(server.revoked.has(a.auth.sessionId!)).toBe(false);
		expect((await b.client.auth.refreshSession()).error).toMatchObject({
			code: "session_not_found"
		});
		expect((await a.client.auth.refreshSession()).error).toBeNull();
	});

	test("stays removed when the removed device touches again", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		await removeDevice(a.db, a.client, b.id, a.now());
		const removedAt = server.rowOf("devices", b.id)?.removed_at;
		server.clock.now += HOUR + MINUTE;
		await b.sync();
		expect(server.rowOf("devices", b.id)?.removed_at).toBe(removedAt);
		await a.sync();
		expect(await listed(a)).not.toContain(b.id);
	});

	test("reports a failure and changes nothing when the server refuses", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		server.fail({ table: "remove_device", op: "rpc", status: 503 });
		const result = await removeDevice(a.db, a.client, b.id, a.now());
		expect(result).toEqual({ status: "failed" });
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
		expect(await listed(a)).toContain(b.id);
	});

	test("reports a failure on a server without the removal function", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		server.deviceSessions = false;
		const result = await removeDevice(a.db, a.client, b.id, a.now());
		expect(result).toEqual({ status: "failed" });
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
		expect(await listed(a)).toContain(b.id);
	});

	test("still touches the device on a server without the removal function", async () => {
		const { server, a } = await pair();
		server.deviceSessions = false;
		await a.sync();
		const touched = server.rowOf("devices", a.id)?.last_seen_at;
		server.clock.now += HOUR + MINUTE;
		await a.sync();
		expect(server.rowOf("devices", a.id)?.last_seen_at).not.toBe(touched);
		expect(await a.db.sync_meta.get("lastTouchAt")).toMatchObject({ value: server.clock.now });
	});

	test("frees a place under the device limit", async () => {
		const server = new FakeServer();
		server.clock.now += 0;
		server.limits.devices = 2;
		const a = await openDevice(server, { name: "phone" });
		const b = await openDevice(server, { name: "laptop" });
		const c = await openDevice(server, { name: "tablet" });
		for (const device of [a, b, c]) await device.signIn();
		await a.sync();
		await b.sync();
		const refused = await c.sync();
		expect(refused.status.state).toBe("deviceLimit");
		await removeDevice(a.db, a.client, b.id, a.now());
		server.clock.now += 2 * DAY;
		const accepted = await c.sync();
		expect(accepted.status.state).toBe("synced");
		expect(server.ids("devices")).toContain(c.id);
	});
});

describe("signing out", () => {
	const settled = async () => {
		const world = await pair();
		for (const device of [world.a, world.b, world.a]) await device.sync();
		return world;
	};

	test("takes this device off the account's list for the others", async () => {
		const { server, a, b } = await settled();
		const out = await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		expect(out).toEqual({ status: "ok" });
		expect(server.rowOf("devices", b.id)?.removed_at).not.toBeNull();
		await a.sync();
		expect(await listed(a)).toEqual([a.id]);
	});

	test("keeps the device's sessions and answers on the server", async () => {
		const { server, a, b } = await settled();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await b.record(daily);
		await b.record(...answersOf(daily, ["ba"], NOW));
		await b.sync();
		await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		await a.sync();
		expect(server.rows("review_logs")).toHaveLength(1);
		expect(server.rowOf("devices", b.id)).toBeDefined();
	});

	test("brings the device back to the list when it signs in again", async () => {
		const { server, a, b } = await settled();
		await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		server.clock.now += MINUTE;
		await b.signIn();
		await b.sync();
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
		await a.sync();
		expect(await listed(a)).toContain(b.id);
	});

	test("still signs out when the server refuses the mark", async () => {
		const { server, b } = await settled();
		server.fail({ table: "devices", op: "update", status: 503 });
		const out = await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		expect(out).toEqual({ status: "ok" });
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
		expect((await b.client.auth.getSession()).data.session).toBeNull();
		expect(await b.ids("review_logs")).toEqual([]);
	});

	test("still signs out on a server that has no device removal", async () => {
		const { server, b } = await settled();
		server.deviceRemoval = false;
		const out = await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		expect(out).toEqual({ status: "ok" });
		expect((await b.client.auth.getSession()).data.session).toBeNull();
	});

	test("does not wait on a server that never answers", async () => {
		const { server, b } = await settled();
		server.beforeRequest = ({ table, op }) =>
			table === "devices" && op === "update"
				? new Promise((resolve) => setTimeout(resolve, 60_000)).then(() => undefined)
				: undefined;
		const started = Date.now();
		const out = await signOut(b.db, b.client, { confirmed: true, now: b.now() });
		expect(out).toEqual({ status: "ok" });
		expect(Date.now() - started).toBeLessThan(LEAVE_WAIT_MS + 1_000);
		expect((await b.client.auth.getSession()).data.session).toBeNull();
		server.beforeRequest = null;
	}, 15_000);

	test("marks nothing when the sign-out is held back for unsent changes", async () => {
		const { server, b } = await settled();
		await b.record(review("ba", "code2region", NOW + MINUTE));
		const out = await signOut(b.db, b.client, { confirmed: false, now: b.now() });
		expect(out.status).toBe("pending");
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
	});
});

describe("signing out a removed device", () => {
	const settled = async () => {
		const world = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await world.b.record(daily);
		await world.b.record(...answersOf(daily, ["ba"], NOW));
		for (const device of [world.a, world.b, world.a]) await device.sync();
		return world;
	};
	const removeB = ({ a, b }: { a: Device; b: Device }) =>
		removeDevice(a.db, a.client, b.id, a.now());
	const signedIn = async (device: Device) =>
		(await device.client.auth.getSession()).data.session !== null;
	const REMOVED: SyncStatus = { state: "removed", quarantined: 0, lastSyncAt: null };

	test("the removed device signs out and wipes on its next round", async () => {
		const world = await settled();
		const { b } = world;
		await removeB(world);
		const result = await b.sync();
		expect(result.status).toEqual(REMOVED);
		expect(result.nextAt).toBeNull();
		expect(result.hold).toBe(false);
		expect(await signedIn(b)).toBe(false);
		expect(await b.ids("review_logs")).toEqual([]);
		expect(await b.ids("practice_runs")).toEqual([]);
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
		expect(await readMeta<string>(b.db, "deviceId")).toBe(b.id);
		expect(snapshot(b.state())).toEqual(snapshot(await b.rebuilt()));
	});

	test("the removed device sends what it had waiting before it leaves", async () => {
		const world = await settled();
		const { server, b } = world;
		await b.record(review("ba", "code2region", NOW + MINUTE));
		await removeB(world);
		const result = await b.sync();
		expect(result.status.state).toBe("removed");
		expect(result.sent).toBe(1);
		expect(server.rows("review_logs")).toHaveLength(2);
		expect(await b.ids("review_logs")).toEqual([]);
		expect(await b.outbox()).toEqual([]);
	});

	test("the removed device signs out after its token can no longer refresh", async () => {
		const { server, a, b, c } = await trio();
		for (const device of [a, b, c, a]) await device.sync();
		await removeDevice(a.db, a.client, b.id, a.now());
		await removeDevice(a.db, a.client, c.id, a.now());
		server.revokedCode = "refresh_token_not_found";
		b.auth.expired = true;
		expect((await b.sync()).status).toEqual(REMOVED);
		await c.record(review("ba", "code2region", NOW + MINUTE));
		server.fail({ table: "review_logs", op: "insert", status: 401, code: "PGRST301" });
		expect((await c.sync()).status).toEqual(REMOVED);
		for (const device of [b, c]) {
			expect(await signedIn(device)).toBe(false);
			expect(await device.ids("review_logs")).toEqual([]);
		}
	});

	test("a session that ends for another reason keeps the data", async () => {
		const { server, b } = await settled();
		server.revoked.add(b.auth.sessionId!);
		b.auth.expired = true;
		const result = await b.sync();
		expect(result.status.state).toBe("sessionEnded");
		expect(await b.ids("review_logs")).toHaveLength(1);
		expect(await readMeta<string>(b.db, "ownerUserId")).toBe("user-1");
		expect(server.calls.at(-1)?.table).toBe("session_removed");
	});

	test("a device that signed in again after removal is not signed out", async () => {
		const world = await settled();
		const { server, b } = world;
		await removeB(world);
		const removedSession = b.auth.sessionId;
		await b.signIn();
		expect(b.auth.sessionId).not.toBe(removedSession);
		expect((await b.sync()).status.state).toBe("synced");
		expect(server.rowOf("devices", b.id)?.session_id).toBe(removedSession);
		server.clock.now += HOUR + MINUTE;
		expect((await b.sync()).status.state).toBe("synced");
		expect(server.rowOf("devices", b.id)).toMatchObject({
			session_id: b.auth.sessionId,
			removed_at: null,
			removal_reason: null
		});
		expect((await b.sync()).status.state).toBe("synced");
		expect(await signedIn(b)).toBe(true);
		expect(await b.ids("review_logs")).toHaveLength(1);
	});

	test("a removal check the server cannot answer keeps the data", async () => {
		const world = await settled();
		const { server, b } = world;
		await removeB(world);
		server.fail({ table: "session_removed", op: "rpc", status: 503 });
		const result = await b.sync();
		expect(result.status.state).toBe("synced");
		expect(await signedIn(b)).toBe(true);
		expect(await b.ids("review_logs")).toHaveLength(1);
	});

	test("a second tab of the removed device sees the wipe", async () => {
		const world = await settled();
		const { server, b } = world;
		const tab = createAppStore({
			db: b.db,
			bundle: b.store.bundle,
			log: b.store.getState().log
		});
		let checked = false;
		let first: SyncResult | null = null;
		// The removal and the first tab's round land while the second tab is pulling.
		server.beforeRequest = async ({ table, op }) => {
			if (table === "session_removed") checked = true;
			else if (checked && !first && op === "select") {
				first = {} as SyncResult;
				await removeB(world);
				first = await b.sync();
			}
		};
		const sentBefore = server.rows("review_logs").length;
		const wipes = await wipesOf(b.db);
		const second = await syncNow(
			b.db,
			b.client,
			{ now: b.now(), random: () => 0.5, online: true, retryAfter: () => null },
			tab.getState().log,
			tab.bundle
		);
		server.beforeRequest = null;
		expect(first!.status).toEqual(REMOVED);
		expect(second.status.state).not.toBe("removed");
		expect(await wipesOf(b.db)).toBe(wipes + 1);
		expect(second.sent).toBe(0);
		expect(server.rows("review_logs")).toHaveLength(sentBefore);
		expect(second.log.logVersion).toBe(first!.log.logVersion);
		expect(snapshot(second.log.state)).toEqual(snapshot(await b.rebuilt()));
		expect(await readMeta(b.db, "lastSyncAt")).toBeUndefined();
		expect(await b.ids("review_logs")).toEqual([]);
	});
});
