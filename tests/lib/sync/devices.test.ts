import { describe, expect, test } from "bun:test";
import { LEAVE_WAIT_MS, removeDevice, signOut } from "../../../src/lib/auth/account";
import { listDevices } from "../../../src/lib/db/device";
import { deviceRows } from "../../../src/lib/view/account";
import { openDevice } from "./support/device";
import { answersOf, DAY, HOUR, MINUTE, NOW, openRun, review } from "./support/events";
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

	test("is undone by the next touch from a device that is really in use", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		await removeDevice(a.db, a.client, b.id, a.now());
		server.clock.now += HOUR + MINUTE;
		await b.sync();
		expect(server.rowOf("devices", b.id)?.removed_at).toBeNull();
		await a.sync();
		expect(await listed(a)).toContain(b.id);
	});

	test("reports a failure and changes nothing when the server refuses", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		server.fail({ table: "devices", op: "update", status: 503 });
		const result = await removeDevice(a.db, a.client, b.id, a.now());
		expect(result).toEqual({ status: "failed" });
		expect(await listed(a)).toContain(b.id);
	});

	test("reports a failure on a server that has no such column", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		server.deviceRemoval = false;
		const result = await removeDevice(a.db, a.client, b.id, a.now());
		expect(result).toEqual({ status: "failed" });
		expect(await listed(a)).toContain(b.id);
	});

	test("still touches the device on a server that has no such column", async () => {
		const { server, a } = await pair();
		server.deviceRemoval = false;
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
