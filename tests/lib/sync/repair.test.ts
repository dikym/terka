import { describe, expect, test } from "bun:test";
import { expectConsistent, type Device } from "./support/device";
import { answersOf, closeOf, DAY_KEY, MINUTE, NOW, openRun } from "./support/events";
import type { FakeServer } from "./support/server";
import { pair } from "./support/world";

const FLAG = "closesReconciled";

async function finishDaily(device: Device, at: number) {
	const daily = openRun("daily", at, { plannedCount: 1 });
	await device.record(daily);
	await device.record(...answersOf(daily, ["ba"], at));
	await device.record(closeOf(daily, at + 5 * MINUTE));
	return daily;
}

// The state older versions left behind: closed on the device, open on the server, nothing queued.
async function leaveClosesLost(server: FakeServer, device: Device) {
	for (const row of server.rows("practice_runs"))
		Object.assign(row, { ended_at: null, answered: null, correct: null, active_ms: null });
	await device.db.sync_meta.delete(FLAG);
}

describe("sessions whose close was lost", () => {
	test("are closed on the server by the device that ran them, then reach the others", async () => {
		const { server, a, b } = await pair();
		await finishDaily(a, NOW);
		await finishDaily(a, NOW + 30 * MINUTE);
		await a.sync();
		await leaveClosesLost(server, a);
		await b.sync();
		expect(b.state().doneDays.has(DAY_KEY)).toBe(false);
		await a.sync();
		await b.sync();
		expect(server.rows("practice_runs").filter((row) => row.ended_at === null)).toEqual([]);
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
		await expectConsistent(a, b);
	});

	test("are looked up once per device", async () => {
		const { server, a } = await pair();
		await finishDaily(a, NOW);
		await a.sync();
		expect(await a.db.sync_meta.get(FLAG)).toBeDefined();
		await leaveClosesLost(server, a);
		await a.db.sync_meta.put({ key: FLAG, value: true });
		await a.sync();
		expect(server.rows("practice_runs").every((row) => row.ended_at === null)).toBe(true);
	});

	test("are looked up again after a lookup that failed", async () => {
		const { server, a } = await pair();
		await finishDaily(a, NOW);
		await a.sync();
		await leaveClosesLost(server, a);
		server.fail({ table: "practice_runs", op: "select", status: 503 });
		await a.sync();
		expect(await a.db.sync_meta.get(FLAG)).toBeUndefined();
		await a.sync();
		expect(await a.db.sync_meta.get(FLAG)).toBeDefined();
		expect(server.rows("practice_runs").every((row) => row.ended_at !== null)).toBe(true);
	});

	test("are not closed for a session that is still open on the device", async () => {
		const { server, a } = await pair();
		const open = openRun("daily", NOW, { plannedCount: 2 });
		await a.record(open);
		await a.sync();
		await a.db.sync_meta.delete(FLAG);
		await a.sync();
		expect(server.rowOf("practice_runs", open.row.id)?.ended_at).toBeNull();
		expect(await a.outbox()).toEqual([]);
	});

	test("are not queued twice when their close is already waiting", async () => {
		const { server, a } = await pair();
		const daily = await finishDaily(a, NOW);
		await a.sync();
		await leaveClosesLost(server, a);
		await a.db.outbox.add({ table: "practice_runs", key: daily.row.id, op: "close" });
		server.fail({ table: "practice_runs", op: "update", commit: true });
		await a.sync();
		const waiting = (await a.outbox()).filter((item) => item.op === "close");
		expect(waiting.length).toBeLessThanOrEqual(1);
		await a.sync();
		expect(server.rowOf("practice_runs", daily.row.id)?.ended_at).not.toBeNull();
		expect(await a.outbox()).toEqual([]);
	});

	test("leave a device with nothing local with nothing queued", async () => {
		const { server, a, b } = await pair();
		await finishDaily(a, NOW);
		await a.sync();
		await leaveClosesLost(server, a);
		await b.sync();
		expect(await b.outbox()).toEqual([]);
		expect(await b.db.sync_meta.get(FLAG)).toBeDefined();
	});
});
