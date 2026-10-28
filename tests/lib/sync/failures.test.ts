import { describe, expect, test } from "bun:test";
import { acceptPolicy, recordConsent } from "../../../src/lib/auth/consent";
import { wipeLocalData } from "../../../src/lib/auth/account";
import { expectConsistent, openDevice } from "./support/device";
import { answersOf, closeOf, DAY, MINUTE, NOW, openRun, review } from "./support/events";
import { FakeServer } from "./support/server";
import { pair } from "./support/world";

const answers = (count: number, at = NOW) =>
	Array.from({ length: count }, (_, index) =>
		review(index % 2 ? "ba" : "bb", "code2region", at + (index + 1) * 1000)
	);

describe("a network that fails", () => {
	test("keeps every row for the next round when the push does not go through", async () => {
		const { server, a, b } = await pair();
		await a.record(...answers(3));
		server.fail({ table: "review_logs", op: "insert", status: 0, message: "Failed to fetch" });
		const failed = await a.sync();
		expect(failed.nextAt).not.toBeNull();
		expect(failed.status.state).toBe("pending");
		expect(server.ids("review_logs")).toEqual([]);
		expect((await a.outbox()).length).toBeGreaterThan(0);
		await a.sync();
		await b.sync();
		expect(server.ids("review_logs")).toHaveLength(3);
		await expectConsistent(a, b);
	});

	test("sends the rows that were not reached by the failure on the next round", async () => {
		const { server, a } = await pair();
		const open = openRun("daily", NOW, { plannedCount: 1 });
		await a.record(open);
		await a.record(...answersOf(open, ["ba"], NOW));
		await a.record(closeOf(open, NOW + 5 * MINUTE));
		server.fail({ table: "review_logs", op: "insert", status: 503 });
		await a.sync();
		expect(server.ids("practice_runs")).toHaveLength(1);
		await a.sync();
		expect(server.ids("review_logs")).toHaveLength(1);
		expect(server.rows("practice_runs")[0].ended_at).not.toBeNull();
		expect(await a.outbox()).toEqual([]);
	});

	test("does not duplicate rows the server stored before the reply was lost", async () => {
		const { server, a, b } = await pair();
		await a.record(...answers(4));
		server.fail({ table: "review_logs", op: "insert", commit: true });
		await a.sync();
		expect(server.ids("review_logs")).toHaveLength(4);
		const second = await a.sync();
		await b.sync();
		expect(server.ids("review_logs")).toHaveLength(4);
		expect(second.status.state).toBe("synced");
		expect(await a.outbox()).toEqual([]);
		expect((await a.ids("review_logs")).length).toBe(4);
		const stored = await a.stored("review_logs", (await a.ids("review_logs"))[0]);
		expect(stored?.receivedAt).not.toBeNull();
		await expectConsistent(a, b);
	});

	test("accepts a close the server already applied before the reply was lost", async () => {
		const { server, a, b } = await pair();
		const open = openRun("daily", NOW, { plannedCount: 1 });
		await a.record(open);
		await a.record(...answersOf(open, ["ba"], NOW));
		await a.record(closeOf(open, NOW + 5 * MINUTE));
		server.fail({ table: "practice_runs", op: "update", commit: true });
		await a.sync();
		expect(server.rows("practice_runs")[0].ended_at).not.toBeNull();
		const second = await a.sync();
		await b.sync();
		expect(second.status.quarantined).toBe(0);
		expect(await a.outbox()).toEqual([]);
		expect(b.state().doneDays.size).toBe(1);
	});

	test("sets a close aside when the server holds a different one", async () => {
		const { server, a } = await pair();
		const open = openRun("daily", NOW, { plannedCount: 1 });
		await a.record(open);
		await a.record(...answersOf(open, ["ba"], NOW));
		await a.record(closeOf(open, NOW + 5 * MINUTE));
		server.beforeRequest = ({ table, op }) => {
			if (table !== "practice_runs" || op !== "update") return;
			const row = server.rowOf("practice_runs", open.row.id)!;
			Object.assign(row, {
				ended_at: new Date(NOW + 9 * MINUTE).toISOString(),
				answered: 9,
				correct: 9,
				active_ms: 1
			});
		};
		const result = await a.sync();
		expect(result.status.quarantined).toBe(1);
		expect((await a.quarantined()).map((row) => row.table)).toEqual(["practice_runs"]);
		expect(await a.outbox()).toEqual([]);
		expect(server.ids("review_logs")).toHaveLength(1);
	});

	test("pulls on the next round after a failed pull, with the push already done", async () => {
		const { server, a, b } = await pair();
		await a.record(...answers(2));
		await a.sync();
		await b.record(review("be", "code2region", NOW + 5 * MINUTE));
		server.fail({ table: "review_logs", op: "select", status: 503 });
		const failed = await b.sync();
		expect(failed.nextAt).not.toBeNull();
		expect(server.ids("review_logs")).toHaveLength(3);
		await b.sync();
		await a.sync();
		expect(await b.ids("review_logs")).toHaveLength(3);
		await expectConsistent(a, b);
	});

	test("backs off longer after each failure and starts over after a success", async () => {
		const { server, a } = await pair();
		await a.record(...answers(1));
		server.fail({ table: "review_logs", op: "insert", status: 500, times: 3 });
		const waits: number[] = [];
		for (let round = 0; round < 3; round++) {
			const result = await a.sync();
			waits.push(result.nextAt! - a.now());
		}
		expect(waits[2]).toBeGreaterThan(waits[0]);
		expect(await a.db.sync_meta.get("failures")).toBeDefined();
		await a.sync();
		expect(await a.db.sync_meta.get("failures")).toBeUndefined();
		expect(await a.db.sync_meta.get("failingSince")).toBeUndefined();
	});

	test("reports an offline device as offline while rows wait", async () => {
		const { server, a } = await pair();
		a.setOnline(false);
		await a.record(...answers(1));
		server.fail({ op: "insert", status: 0, times: 50 });
		const result = await a.sync();
		expect(result.status.state).toBe("offline");
		expect(await a.outbox()).not.toEqual([]);
	});

	test("calls a server that stays down for days unreachable and keeps the rows", async () => {
		const { server, a } = await pair();
		await a.record(...answers(2));
		server.fail({ op: "insert", status: 503, times: 1000 });
		await a.sync();
		server.clock.now += 4 * DAY;
		const result = await a.sync();
		expect(result.status.state).toBe("unreachable");
		expect(await a.outbox()).not.toEqual([]);
		expect(await a.ids("review_logs")).toHaveLength(2);
	});
});

describe("a sign-in that expires", () => {
	test("refreshes the session and sends the rows in the same round", async () => {
		const { server, a, b } = await pair();
		await a.record(...answers(2));
		server.fail({ table: "review_logs", op: "insert", status: 401, code: "PGRST301" });
		const result = await a.sync();
		await b.sync();
		expect(result.status.state).toBe("synced");
		expect(server.ids("review_logs")).toHaveLength(2);
	});

	test("keeps every row when the session cannot be refreshed", async () => {
		const { server, a, b } = await pair();
		await a.record(...answers(2));
		a.auth.refreshFails = true;
		server.fail({ table: "review_logs", op: "insert", status: 401, code: "PGRST301" });
		const ended = await a.sync();
		expect(ended.status.state).toBe("sessionEnded");
		expect(server.ids("review_logs")).toEqual([]);
		a.auth.refreshFails = false;
		await a.sync();
		await b.sync();
		expect(server.ids("review_logs")).toHaveLength(2);
		await expectConsistent(a, b);
	});

	test("makes no request while signed out and keeps the outbox", async () => {
		const { server, a } = await pair();
		await a.record(...answers(2));
		a.auth.userId = null;
		const before = server.calls.length;
		const result = await a.sync();
		expect(result.status.state).toBe("sessionEnded");
		expect(server.calls.length).toBe(before);
		expect((await a.outbox()).length).toBeGreaterThan(0);
	});

	test("waits for the time the server names when it asks to slow down", async () => {
		const { server, a } = await pair();
		await a.record(...answers(1));
		server.fail({ table: "review_logs", op: "insert", status: 429 });
		const result = await a.sync();
		expect(result.nextAt).toBe(a.now() + 60_000);
		expect(await a.outbox()).not.toEqual([]);
	});
});

describe("rows the server refuses", () => {
	test("sets aside a session kind an older server does not know, with its answers", async () => {
		const { server, a } = await pair();
		server.allowedKinds.delete("recheck");
		const recheck = openRun("recheck", NOW, { plannedCount: 2 });
		await a.record(recheck);
		await a.record(...answersOf(recheck, ["ba", "bb"], NOW));
		await a.record(closeOf(recheck, NOW + 5 * MINUTE));
		const daily = openRun("daily", NOW + 30 * MINUTE, { plannedCount: 1 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["be"], NOW + 30 * MINUTE));
		await a.record(closeOf(daily, NOW + 40 * MINUTE));
		const result = await a.sync();
		expect(server.ids("practice_runs")).toEqual([daily.row.id]);
		expect(server.ids("review_logs")).toHaveLength(1);
		expect(result.status.quarantined).toBeGreaterThanOrEqual(3);
		const keys = (await a.quarantined()).map((row) => row.key);
		expect(keys).toContain(recheck.row.id);
		expect(await a.ids("review_logs")).toHaveLength(3);
		expect(await a.outbox()).toEqual([]);
	});

	test("sets aside only the rejected answer from a batch", async () => {
		const { server, a } = await pair();
		const rows = answers(5);
		rows[2] = review("ba", "code2region", NOW + 9000, { runId: "no-such-session" });
		await a.record(...rows);
		const result = await a.sync();
		expect(server.ids("review_logs")).toHaveLength(4);
		expect(result.status.quarantined).toBe(1);
		expect((await a.quarantined())[0].key).toBe(rows[2].row.id);
	});

	test("keeps a rejected row on the device", async () => {
		const { a } = await pair();
		const bad = review("ba", "code2region", NOW + 1000, { runId: "no-such-session" });
		await a.record(bad);
		await a.sync();
		expect(await a.stored("review_logs", bad.row.id)).toBeDefined();
	});

	test("does not send anything for a session whose own row was refused", async () => {
		const { server, a } = await pair();
		server.allowedKinds.delete("recheck");
		const recheck = openRun("recheck", NOW, { plannedCount: 1 });
		await a.record(recheck);
		await a.record(...answersOf(recheck, ["ba"], NOW));
		await a.sync();
		expect(server.ids("review_logs")).toEqual([]);
	});
});

describe("limits and consent", () => {
	test("holds log rows back until the policy is accepted, then sends them at once", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		const a = await openDevice(server, { name: "phone" });
		await a.signIn("user-1", false);
		await a.record(...answers(3));
		const held = await a.sync();
		expect(held.status.state).toBe("consentNeeded");
		expect(server.ids("review_logs")).toEqual([]);
		expect(server.ids("devices")).toEqual([a.id]);
		await acceptPolicy(a.db, "v1", a.now());
		await recordConsent(a.db, a.now());
		const released = await a.sync();
		expect(released.status.state).toBe("synced");
		expect(server.ids("review_logs")).toHaveLength(3);
	});

	test("releases rows held for consent once another device has consented", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		const a = await openDevice(server, { name: "phone" });
		const b = await openDevice(server, { name: "laptop" });
		await a.signIn("user-1", false);
		await b.signIn("user-1", true);
		await a.record(...answers(2));
		await a.sync();
		expect(server.ids("review_logs")).toEqual([]);
		await b.sync();
		await a.sync();
		await a.sync();
		expect(server.ids("review_logs")).toHaveLength(2);
		await b.sync();
		await expectConsistent(a, b);
	});

	test("sends the rest of a backlog the next day after the daily limit", async () => {
		const { server, a, b } = await pair();
		server.limits.daily = 200;
		await a.record(...answers(250));
		const first = await a.sync();
		expect(server.ids("review_logs")).toHaveLength(200);
		expect(["dailyLimit", "staged"]).toContain(first.status.state);
		expect(first.nextAt).toBe(Math.floor(a.now() / DAY) * DAY + DAY);
		server.clock.now += DAY;
		const next = await a.sync();
		expect(next.status.state).toBe("synced");
		expect(server.ids("review_logs")).toHaveLength(250);
		await b.sync();
		await expectConsistent(a, b);
	});

	test("reports how much of a claimed history has gone out while the daily limit holds", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		server.limits.daily = 200;
		const a = await openDevice(server, { name: "phone" });
		await a.record(...answers(250));
		await a.signIn();
		const first = await a.sync();
		expect(first.status).toMatchObject({ state: "staged", sent: 200, total: 250 });
		server.clock.now += DAY;
		const next = await a.sync();
		expect(next.status.state).toBe("synced");
		expect(server.ids("review_logs")).toHaveLength(250);
	});

	test("stops sending for good at the total limit and keeps the rows", async () => {
		const { server, a } = await pair();
		server.limits.total = 3;
		await a.record(...answers(5));
		const result = await a.sync();
		expect(result.status.state).toBe("totalLimit");
		expect(result.nextAt).toBeNull();
		expect(server.ids("review_logs")).toEqual([]);
		expect(await a.ids("review_logs")).toHaveLength(5);
		expect(await a.outbox()).not.toEqual([]);
	});

	test("holds a device that is over the device limit for a day", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		server.limits.devices = 1;
		const a = await openDevice(server, { name: "phone" });
		const b = await openDevice(server, { name: "laptop" });
		await a.signIn();
		await b.signIn();
		await a.sync();
		await b.record(...answers(2));
		const refused = await b.sync();
		expect(refused.status.state).toBe("deviceLimit");
		expect(server.ids("review_logs")).toEqual([]);
		server.limits.devices = 5;
		server.clock.now += DAY + MINUTE;
		await b.sync();
		expect(server.ids("review_logs")).toHaveLength(2);
	});

	test("holds a first device for a day while sign-ups are closed", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		server.signupsOpen = false;
		const a = await openDevice(server, { name: "phone" });
		await a.signIn();
		await a.record(...answers(2));
		const result = await a.sync();
		expect(result.status.state).toBe("signupsClosed");
		server.signupsOpen = true;
		server.clock.now += DAY + MINUTE;
		await a.sync();
		expect(server.ids("review_logs")).toHaveLength(2);
	});

	test("never sends a row for one account to another", async () => {
		const { server, a } = await pair();
		await a.record(...answers(2));
		a.auth.userId = "user-2";
		const before = server.calls.length;
		const result = await a.sync();
		expect(result.status.state).toBe("otherAccount");
		expect(server.calls.length).toBe(before);
		expect(server.ids("review_logs", "user-2")).toEqual([]);
	});
});

describe("work that overlaps a round", () => {
	test("keeps an answer recorded while the round is pulling", async () => {
		const { server, a, b } = await pair();
		await b.record(review("bb", "code2region", NOW + 2 * MINUTE));
		await b.sync();
		const mid = review("ba", "code2region", NOW + 3 * MINUTE);
		let done = false;
		server.beforeRequest = async ({ table, op }) => {
			if (done || table !== "review_logs" || op !== "select") return;
			done = true;
			await a.record(mid);
		};
		await a.sync();
		server.beforeRequest = null;
		expect(await a.ids("review_logs")).toContain(mid.row.id);
		await a.sync();
		await b.sync();
		expect(server.ids("review_logs")).toContain(mid.row.id);
		await expectConsistent(a, b);
	});

	test("writes nothing from a pull into data that was wiped during the round", async () => {
		const { server, a, b } = await pair();
		await b.record(...answers(3));
		await b.sync();
		let wiped = false;
		server.beforeRequest = async ({ table, op }) => {
			if (wiped || table !== "review_logs" || op !== "select") return;
			wiped = true;
			await wipeLocalData(a.db);
		};
		await a.sync();
		server.beforeRequest = null;
		expect(await a.ids("review_logs")).toEqual([]);
		expect(await a.outbox()).toEqual([]);
	});

	test("touches the device row at most once an hour", async () => {
		const { server, a } = await pair();
		await a.sync();
		const touches = () =>
			server.calls.filter((call) => call.table === "devices" && call.op === "update").length;
		const first = touches();
		await a.sync();
		expect(touches()).toBe(first);
		server.clock.now += 61 * MINUTE;
		await a.sync();
		expect(touches()).toBe(first + 1);
	});
});
