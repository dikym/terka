import { describe, expect, test } from "bun:test";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { signOut } from "../../../src/lib/auth/account";
import { afterSignIn, switchAccount } from "../../../src/lib/auth/signin";
import { exportData, importData } from "../../../src/lib/db/transfer";
import { loadNotes, loadSettings, saveNote, saveSettings } from "../../../src/lib/db/settings";
import { snapshot } from "../../core/replay/fixtures";
import { withUuids } from "../db/fixtures";
import { eventIds, expectConsistent, openDevice, type Device } from "./support/device";
import { answersOf, closeOf, DAY_KEY, DAY, MINUTE, NOW, openRun, review } from "./support/events";
import { FakeServer } from "./support/server";
import { pair, trio } from "./support/world";

const jawa = { scope: { level: "group" as const, id: "jawa" }, specialEnabled: false };
const sumatera = { scope: { level: "group" as const, id: "sumatera" }, specialEnabled: true };

const settingsOf = (device: Device) => loadSettings(device.db);
const edit = (device: Device, at: number, settings = jawa) =>
	saveSettings(device.db, settings, { now: at, deviceId: device.id });
const note = (device: Device, id: string, body: string, at: number) =>
	saveNote(device.db, id, body, { now: at, deviceId: device.id });

describe("settings changed on one device", () => {
	test("show on the other device", async () => {
		const { a, b } = await pair();
		await edit(a, NOW + MINUTE, sumatera);
		await a.sync();
		await b.sync();
		expect(await settingsOf(b)).toEqual(sumatera);
	});

	test("let the later of two changes win on both devices", async () => {
		const { a, b } = await pair();
		await edit(a, NOW + MINUTE, jawa);
		await edit(b, NOW + 2 * MINUTE, sumatera);
		await a.sync();
		await b.sync();
		await a.sync();
		expect(await settingsOf(a)).toEqual(sumatera);
		expect(await settingsOf(b)).toEqual(sumatera);
	});

	test("are not overwritten by an older change that syncs later", async () => {
		const { server, a, b } = await pair();
		await edit(a, NOW + 5 * MINUTE, sumatera);
		await a.sync();
		await edit(b, NOW + 3 * MINUTE, jawa);
		await b.sync();
		await a.sync();
		expect(await settingsOf(a)).toEqual(sumatera);
		expect(await settingsOf(b)).toEqual(sumatera);
		expect(server.rows("user_settings")[0].active_scope_id).toBe("sumatera");
	});

	test("settle a tie on the time by the device id, the same on both devices", async () => {
		const { a, b } = await pair();
		await edit(a, NOW + MINUTE, jawa);
		await edit(b, NOW + MINUTE, sumatera);
		await a.sync();
		await b.sync();
		await a.sync();
		expect(await settingsOf(a)).toEqual(await settingsOf(b));
		const winner = a.id > b.id ? jawa : sumatera;
		expect(await settingsOf(a)).toEqual(winner);
	});

	test("send only the latest of several saves before a round", async () => {
		const { server, a } = await pair();
		await edit(a, NOW + MINUTE, jawa);
		await edit(a, NOW + 2 * MINUTE, sumatera);
		await edit(a, NOW + 3 * MINUTE, jawa);
		await a.sync();
		const sent = server.calls.filter(
			(call) => call.table === "user_settings" && call.op === "upsert"
		);
		expect(sent).toHaveLength(1);
		expect(server.rows("user_settings")[0].active_scope_id).toBe("jawa");
	});

	test("go out after the device row they point to", async () => {
		const { server, a } = await pair();
		await edit(a, NOW + MINUTE);
		const result = await a.sync();
		expect(result.status.quarantined).toBe(0);
		expect(server.rows("user_settings")).toHaveLength(1);
	});

	test("start from the national scope on a device that has none", async () => {
		const { a } = await pair();
		expect((await settingsOf(a)).scope).toEqual(NATIONAL);
	});
});

describe("notes written on several devices", () => {
	test("merge by card from both devices", async () => {
		const { a, b } = await pair();
		await note(a, "ba", "catatan a", NOW + MINUTE);
		await note(b, "bb", "catatan b", NOW + 2 * MINUTE);
		await a.sync();
		await b.sync();
		await a.sync();
		expect([...(await loadNotes(a.db))].sort()).toEqual([
			["ba", "catatan a"],
			["bb", "catatan b"]
		]);
		expect(await loadNotes(b.db)).toEqual(await loadNotes(a.db));
	});

	test("keep the later edit of the same card", async () => {
		const { a, b } = await pair();
		await note(a, "ba", "lama", NOW + MINUTE);
		await note(b, "ba", "baru", NOW + 2 * MINUTE);
		await b.sync();
		await a.sync();
		await b.sync();
		expect((await loadNotes(a.db)).get("ba")).toBe("baru");
		expect((await loadNotes(b.db)).get("ba")).toBe("baru");
	});

	test("let a deletion beat an older text elsewhere", async () => {
		const { a, b } = await pair();
		await note(a, "ba", "isi", NOW + MINUTE);
		await a.sync();
		await b.sync();
		await note(a, "ba", "", NOW + 5 * MINUTE);
		await note(b, "ba", "isi diubah", NOW + 3 * MINUTE);
		await a.sync();
		await b.sync();
		await a.sync();
		expect((await loadNotes(a.db)).has("ba")).toBe(false);
		expect((await loadNotes(b.db)).has("ba")).toBe(false);
	});
});

describe("devices of one account", () => {
	test("each learn of the other", async () => {
		const { server, a, b } = await pair();
		await a.sync();
		await b.sync();
		await a.sync();
		expect(server.ids("devices")).toEqual([a.id, b.id].sort());
		expect((await a.db.devices.toArray()).map((row) => row.id).sort()).toEqual(
			[a.id, b.id].sort()
		);
	});

	test("are not registered twice when sign-in repeats", async () => {
		const { server, a } = await pair();
		await a.sync();
		await afterSignIn(a.db, a.client, a.now());
		await a.sync();
		expect(server.ids("devices")).toEqual([a.id]);
	});
});

describe("history from before signing in", () => {
	test("reaches the account and then the other devices", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 6 * DAY;
		const a = await openDevice(server, { name: "phone" });
		for (let day = 0; day < 3; day++) {
			const daily = openRun("daily", NOW + day * DAY, { plannedCount: 2 });
			await a.record(daily);
			await a.record(...answersOf(daily, ["ba", "bb"], NOW + day * DAY));
			await a.record(closeOf(daily, NOW + day * DAY + 10 * MINUTE));
		}
		await a.signIn();
		const b = await openDevice(server, { name: "laptop" });
		await b.signIn();
		await a.sync();
		await b.sync();
		expect(server.rows("practice_runs").filter((row) => row.ended_at === null)).toEqual([]);
		expect(b.state().doneDays.size).toBe(3);
		await expectConsistent(a, b);
	});

	test("is not mixed into a second account on the same device", async () => {
		const { server, a } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await a.sync();
		a.auth.userId = "user-2";
		const result = await afterSignIn(a.db, a.client, a.now());
		expect(result.status).toBe("otherAccount");
		await a.sync();
		expect(server.ids("review_logs", "user-2")).toEqual([]);
		expect(server.ids("review_logs", "user-1")).toHaveLength(1);
	});

	test("is replaced by the new account's own data when the device switches account", async () => {
		const { server, a, b } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await a.sync();
		b.auth.userId = "user-2";
		await b.signIn("user-2");
		await b.record(review("bb", "code2region", NOW + 2 * MINUTE));
		await b.sync();
		a.auth.userId = "user-2";
		await switchAccount(a.db, a.client, a.now());
		await a.sync();
		expect(await a.ids("review_logs")).toEqual(server.ids("review_logs", "user-2"));
		expect(server.ids("review_logs", "user-1")).toHaveLength(1);
	});
});

describe("a device that has just signed in", () => {
	test("pulls nothing in a round that starts before its data is claimed", async () => {
		const { a } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["ba"], NOW));
		await a.record(closeOf(daily, NOW + 5 * MINUTE));
		await a.sync();
		const fresh = await openDevice(a.server, { name: "tablet" });
		fresh.auth.userId = "user-1";
		const early = await fresh.sync();
		expect(early.status.state).toBe("otherAccount");
		expect(await fresh.ids("review_logs")).toEqual([]);
		await afterSignIn(fresh.db, fresh.client, fresh.now());
		await fresh.sync();
		expect(fresh.state().doneDays.has(DAY_KEY)).toBe(true);
	});
});

describe("signing out and in again", () => {
	test("brings back everything from the server and the same state", async () => {
		const { a } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 2 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["ba", "bb"], NOW));
		await a.record(closeOf(daily, NOW + 10 * MINUTE));
		await edit(a, NOW + 11 * MINUTE, sumatera);
		await note(a, "ba", "ingat", NOW + 12 * MINUTE);
		await a.sync();
		const before = snapshot(a.state());
		const events = await eventIds(a);
		const out = await signOut(a.db, a.client, { confirmed: false });
		expect(out).toEqual({ status: "ok" });
		expect(await a.ids("review_logs")).toEqual([]);
		await a.signIn();
		await a.sync();
		expect(await eventIds(a)).toEqual(events);
		expect(snapshot(await a.rebuilt())).toEqual(before);
		expect(await settingsOf(a)).toEqual(sumatera);
		expect((await loadNotes(a.db)).get("ba")).toBe("ingat");
		expect(a.state().doneDays.has(DAY_KEY)).toBe(true);
	});

	test("asks before it drops rows that were never sent", async () => {
		const { a } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		const out = await signOut(a.db, a.client, { confirmed: false });
		expect(out.status).toBe("pending");
		expect(await a.ids("review_logs")).toHaveLength(1);
	});
});

describe("data moved by file", () => {
	async function exported() {
		const server = new FakeServer();
		server.clock.now = NOW + 6 * DAY;
		const offline = await openDevice(server, { name: "old-phone" });
		const daily = openRun("daily", NOW, { plannedCount: 2 });
		const [open, ...rest] = withUuids([
			daily,
			...answersOf(daily, ["ba", "bb"], NOW),
			closeOf(daily, NOW + 10 * MINUTE)
		]);
		await offline.record(open, ...rest);
		const text = await exportData(offline.db, offline.store.bundle, offline.now());
		return { server, text, offline };
	}

	test("reaches other devices once the importing device signs in and syncs", async () => {
		const { server, text } = await exported();
		const importer = await openDevice(server, { name: "new-phone" });
		const result = await importData(importer.db, text);
		expect(result.status).toBe("ok");
		await importer.signIn();
		const other = await openDevice(server, { name: "laptop" });
		await other.signIn();
		await importer.sync();
		await other.sync();
		expect(await other.ids("review_logs")).toHaveLength(2);
		expect(await other.ids("practice_runs")).toHaveLength(1);
	});

	test("brings imported sessions to other devices as finished", async () => {
		const { server, text } = await exported();
		const importer = await openDevice(server, { name: "new-phone" });
		await importData(importer.db, text);
		await importer.signIn();
		const other = await openDevice(server, { name: "laptop" });
		await other.signIn();
		await importer.sync();
		await other.sync();
		expect(server.rows("practice_runs").filter((row) => row.ended_at === null)).toEqual([]);
		expect(other.state().doneDays.has(DAY_KEY)).toBe(true);
	});
});

describe("three devices", () => {
	test("settle on one settings value and one set of notes", async () => {
		const { a, b, c } = await trio();
		await edit(a, NOW + MINUTE, jawa);
		await edit(b, NOW + 2 * MINUTE, sumatera);
		await note(c, "ba", "dari c", NOW + 3 * MINUTE);
		for (const device of [a, b, c, a, b, c]) await device.sync();
		expect(await settingsOf(a)).toEqual(sumatera);
		expect(await settingsOf(b)).toEqual(sumatera);
		expect(await settingsOf(c)).toEqual(sumatera);
		for (const device of [a, b, c])
			expect((await loadNotes(device.db)).get("ba")).toBe("dari c");
	});
});
