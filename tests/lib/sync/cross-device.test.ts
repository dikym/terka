import { describe, expect, test } from "bun:test";
import type { LearningEvent } from "../../../src/core/log/events";
import { effectiveTs } from "../../../src/core/log/order";
import { streakDays } from "../../../src/core/replay/streak";
import { toWire } from "../../../src/lib/db/wire";
import { runPull } from "../../../src/lib/sync/pull";
import { loadState } from "../../../src/lib/db/log";
import { wipesOf } from "../../../src/lib/db/schema";
import { snapshot } from "../../core/replay/fixtures";
import { eventIds, expectConsistent, openDevice, type Device } from "./support/device";
import {
	answersOf,
	cardEvent,
	closeOf,
	DAY,
	DAY_KEY,
	factView,
	MINUTE,
	NOW,
	openRun,
	review,
	sighting,
	voidOf
} from "./support/events";
import { FakeServer } from "./support/server";
import { pair, trio, world } from "./support/world";

const CARD = "ba::code2region";

async function finishDaily(device: Device, at: number, codes: string[]) {
	const daily = openRun("daily", at, { plannedCount: codes.length });
	await device.record(daily);
	await device.record(...answersOf(daily, codes, at));
	await device.record(closeOf(daily, at + 10 * MINUTE));
	return daily;
}

describe("a finished session on one device", () => {
	test("counts as a done day on the other device after both sync", async () => {
		const { server, a, b } = await pair();
		await finishDaily(a, NOW, ["ba", "bb", "be"]);
		const sent = await a.sync();
		await b.sync();
		expect(sent.status.state).toBe("synced");
		expect(sent.sent).toBeGreaterThan(0);
		expect(server.ids("practice_runs")).toHaveLength(1);
		expect(server.ids("review_logs")).toHaveLength(3);
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
		expect([...streakDays(b.state())]).toEqual([DAY_KEY]);
		await expectConsistent(a, b);
	});

	test("is not done on the other device while the session is still open", async () => {
		const { a, b } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 2 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["ba", "bb"], NOW));
		await a.sync();
		await b.sync();
		expect(b.state().doneDays.has(DAY_KEY)).toBe(false);
		expect((await b.stored("practice_runs", daily.row.id))?.endedAt).toBeNull();
	});

	test("becomes done on the other device when the open session is closed later", async () => {
		const { server, a, b } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 2 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["ba", "bb"], NOW));
		await a.sync();
		await b.sync();
		server.clock.now += 10 * MINUTE;
		await a.record(closeOf(daily, NOW + 10 * MINUTE));
		await a.sync();
		await b.sync();
		expect((await b.stored("practice_runs", daily.row.id))?.endedAt).toBe(NOW + 10 * MINUTE);
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
		await expectConsistent(a, b);
	});

	test("is found by a device that synced within five minutes of the close", async () => {
		const { server, a, b } = await pair();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await a.record(daily);
		await a.record(...answersOf(daily, ["ba"], NOW));
		await a.sync();
		await b.sync();
		server.clock.now += MINUTE;
		await a.record(closeOf(daily, NOW + 2 * MINUTE));
		await a.sync();
		await b.sync();
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
	});

	test("brings a challenge day into the streak of the other device", async () => {
		const { a, b } = await pair();
		const challenge = openRun("challenge", NOW);
		await a.record(challenge);
		await a.record(closeOf(challenge, NOW + 3 * MINUTE));
		await a.sync();
		await b.sync();
		expect(b.state().challengeDays.has(DAY_KEY)).toBe(true);
		expect([...streakDays(b.state())]).toEqual([DAY_KEY]);
	});

	test("brings a Kilat record to the other device", async () => {
		const { a, b } = await pair();
		const kilat = openRun("kilat", NOW);
		await a.record(kilat);
		await a.record(closeOf(kilat, NOW + MINUTE, { score: 12 }));
		await a.sync();
		await b.sync();
		expect(b.state().kilatRecords.get("national|")).toBe(12);
	});

	test("brings a daily session and a challenge closed in the same round", async () => {
		const { a, b } = await pair();
		await finishDaily(a, NOW, ["ba", "bb"]);
		const challenge = openRun("challenge", NOW + 20 * MINUTE);
		await a.record(challenge);
		await a.record(closeOf(challenge, NOW + 25 * MINUTE));
		await a.sync();
		await b.sync();
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
		expect(b.state().challengeDays.has(DAY_KEY)).toBe(true);
		expect(await b.stored("practice_runs", challenge.row.id)).toMatchObject({
			endedAt: NOW + 25 * MINUTE
		});
		await expectConsistent(a, b);
	});

	test("leaves no session open on the server once every close is sent", async () => {
		const { server, a } = await pair();
		for (let index = 0; index < 4; index++) await finishDaily(a, NOW + index * MINUTE, ["ba"]);
		await a.sync();
		const open = server.rows("practice_runs").filter((row) => row.ended_at === null);
		expect(open).toEqual([]);
		expect(await a.outbox()).toEqual([]);
	});

	test("brings the days of a week of practice with it", async () => {
		const { server, a, b } = await pair();
		server.clock.now = NOW + 6 * DAY;
		for (let day = 0; day < 5; day++) await finishDaily(a, NOW + day * DAY, ["ba"]);
		await a.sync();
		await b.sync();
		expect(b.state().doneDays.size).toBe(5);
		expect(a.state().doneDays).toEqual(b.state().doneDays);
	});
});

describe("answers recorded on several devices", () => {
	test("all reach every device when each syncs twice", async () => {
		const { a, b } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await b.record(review("bb", "code2region", NOW + 2 * MINUTE));
		await b.record(review("ba", "code2region", NOW + 3 * MINUTE));
		await a.sync();
		await b.sync();
		await a.sync();
		expect(await a.ids("review_logs")).toHaveLength(3);
		await expectConsistent(a, b);
	});

	test("end in the same state whichever device syncs first", async () => {
		const events: Record<string, LearningEvent[]> = {
			phone: [
				review("ba", "code2region", NOW + MINUTE),
				review("bb", "code2region", NOW + 5 * MINUTE)
			],
			laptop: [
				review("ba", "code2region", NOW + 2 * MINUTE, { correct: false }),
				review("be", "code2region", NOW + 3 * MINUTE)
			]
		};
		const outcome = async (order: ("phone" | "laptop")[]) => {
			const { devices } = await world("phone", "laptop");
			const byName = { phone: devices[0], laptop: devices[1] };
			for (const name of ["phone", "laptop"] as const)
				await byName[name].record(...events[name]);
			for (const name of order) await byName[name].sync();
			await byName.phone.sync();
			await byName.laptop.sync();
			await expectConsistent(devices[0], devices[1]);
			return JSON.stringify([...(await devices[0].rebuilt()).cards.entries()].sort());
		};
		expect(await outcome(["laptop", "phone"])).toBe(await outcome(["phone", "laptop"]));
	});

	test("both answers to the same card count on both devices", async () => {
		const { a, b } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await b.record(review("ba", "code2region", NOW + 2 * MINUTE, { correct: false }));
		await a.sync();
		await b.sync();
		await a.sync();
		expect(a.state().cards.get(CARD)?.answered).toBe(2);
		expect(b.state().cards.get(CARD)?.answered).toBe(2);
		expect(a.state().cards.get(CARD)?.wrong).toBe(1);
		await expectConsistent(a, b);
	});

	test("reach a third device that joins later", async () => {
		const { a, b, c } = await trio();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await b.record(review("bb", "code2region", NOW + 2 * MINUTE));
		await c.record(review("be", "code2region", NOW + 3 * MINUTE));
		for (const device of [a, b, c, a, b]) await device.sync();
		expect(await a.ids("review_logs")).toHaveLength(3);
		await expectConsistent(a, b, c);
	});

	test("answered earlier than what the device already holds are placed in time order", async () => {
		const { a, b } = await pair();
		await b.record(review("ba", "code2region", NOW + 9 * MINUTE));
		await a.record(review("ba", "code2region", NOW + MINUTE, { correct: false }));
		await a.sync();
		await b.sync();
		await a.sync();
		await expectConsistent(a, b);
		expect(b.state().cards.get(CARD)?.answered).toBe(2);
	});

	test("answered later than what the device already holds extend its state", async () => {
		const { a, b } = await pair();
		await b.record(review("ba", "code2region", NOW + MINUTE));
		await b.sync();
		await a.record(review("ba", "code2region", NOW + 9 * MINUTE));
		await a.sync();
		await b.sync();
		await expectConsistent(a, b);
		expect(b.state().cards.get(CARD)?.answered).toBe(2);
	});
});

describe("repeated rounds", () => {
	test("a second round with nothing new writes nothing", async () => {
		const { server, a, b } = await pair();
		await finishDaily(a, NOW, ["ba", "bb"]);
		await a.sync();
		await b.sync();
		const before = server.calls.length;
		const rows = server.ids("review_logs");
		await a.sync();
		await b.sync();
		const writes = server.calls
			.slice(before)
			.filter((call) => call.op !== "select" && call.table !== "devices");
		expect(writes).toEqual([]);
		expect(server.ids("review_logs")).toEqual(rows);
		expect(await a.outbox()).toEqual([]);
		expect(await b.outbox()).toEqual([]);
	});

	test("pulling rows the device already holds changes nothing", async () => {
		const { a, b } = await pair();
		const daily = await finishDaily(a, NOW, ["ba", "bb"]);
		await a.sync();
		await b.sync();
		const before = await b.stored("practice_runs", daily.row.id);
		const ids = await b.ids("review_logs");
		await b.sync();
		await b.sync();
		expect(await b.stored("practice_runs", daily.row.id)).toEqual(before);
		expect(await b.ids("review_logs")).toEqual(ids);
		await expectConsistent(a, b);
	});

	test("many rounds in a row end where one round does", async () => {
		const { a, b } = await pair();
		await finishDaily(a, NOW, ["ba"]);
		await a.sync();
		for (let round = 0; round < 4; round++) await b.sync();
		expect(b.state().doneDays.has(DAY_KEY)).toBe(true);
		await expectConsistent(a, b);
	});

	test("records the server time on rows once they are sent", async () => {
		const { server, a } = await pair();
		const answer = review("ba", "code2region", NOW + MINUTE);
		await a.record(answer);
		await a.sync();
		const stored = await a.stored("review_logs", answer.row.id);
		expect(stored?.receivedAt).toBe(server.clock.now);
		expect(stored?.serverSeq).toBeGreaterThan(0);
	});
});

describe("answers that are undone", () => {
	test("stay undone on the device that did not undo them", async () => {
		const { a, b } = await pair();
		const answer = review("ba", "code2region", NOW + MINUTE);
		await b.record(answer);
		await b.sync();
		await a.sync();
		await a.record(voidOf(answer, NOW + 2 * MINUTE));
		await a.sync();
		await b.sync();
		expect(b.state().voided.has(answer.row.id)).toBe(true);
		expect(b.state().cards.get(CARD)?.answered ?? 0).toBe(0);
		await expectConsistent(a, b);
	});

	test("arrive together with the answer on a device that joins later", async () => {
		const { a, c } = await trio();
		const answer = review("ba", "code2region", NOW + MINUTE);
		await a.record(answer);
		await a.record(voidOf(answer, NOW + 2 * MINUTE));
		await a.sync();
		await c.sync();
		expect(c.state().voided.has(answer.row.id)).toBe(true);
		expect(c.state().cards.get(CARD)?.answered ?? 0).toBe(0);
		await expectConsistent(a, c);
	});
});

describe("other kinds of events", () => {
	test("a card suspended on one device is suspended on the other", async () => {
		const { a, b } = await pair();
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await a.record(cardEvent("ba", "code2region", "suspend", NOW + 2 * MINUTE));
		await a.sync();
		await b.sync();
		expect(b.state().cards.get(CARD)?.state).toBe("suspended");
		await b.record(cardEvent("ba", "code2region", "unsuspend", NOW + 3 * MINUTE));
		await b.sync();
		await a.sync();
		expect(a.state().cards.get(CARD)?.state).not.toBe("suspended");
		await expectConsistent(a, b);
	});

	test("sightings and fact views reach the other device with their session", async () => {
		const { server, a, b } = await pair();
		const daily = await finishDaily(a, NOW, ["ba"]);
		await a.record(sighting("ba", NOW + MINUTE));
		await a.record(factView("fact-1", NOW + 2 * MINUTE, { runId: daily.row.id }));
		await a.sync();
		await b.sync();
		expect(server.ids("sightings")).toHaveLength(1);
		expect(await b.ids("sightings")).toHaveLength(1);
		expect(await b.ids("fact_views")).toHaveLength(1);
		await expectConsistent(a, b);
	});

	test("two placement tests settle on the same one everywhere", async () => {
		const { a, b } = await pair();
		const first = openRun("placement", NOW);
		const second = openRun("placement", NOW + 5 * MINUTE);
		await a.record(first);
		await a.record(closeOf(first, NOW + 2 * MINUTE));
		await b.record(second);
		await b.record(closeOf(second, NOW + 7 * MINUTE));
		await a.sync();
		await b.sync();
		await a.sync();
		expect(a.state().placementRunId).toBe(b.state().placementRunId);
		await expectConsistent(a, b);
	});
});

describe("device clocks that are wrong", () => {
	test("a clock a day ahead does not push its answers past the server time", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		const ahead = await openDevice(server, { name: "ahead", skew: DAY });
		const other = await openDevice(server, { name: "other" });
		await ahead.signIn();
		await other.signIn();
		const answer = review("ba", "code2region", ahead.now());
		await ahead.record(answer);
		await ahead.sync();
		await other.sync();
		const stored = await other.stored("review_logs", answer.row.id);
		expect(effectiveTs({ table: "review_logs", row: stored } as LearningEvent)).toBe(
			server.clock.now
		);
		expect(await eventIds(ahead)).toEqual(await eventIds(other));
		expect(snapshot(await ahead.rebuilt())).toEqual(snapshot(await other.rebuilt()));
		// The sending device keeps its own clock's time as the newest event until the state is reloaded.
		const { lastKey: shown, ...shownRest } = snapshot(ahead.state());
		const { lastKey: rebuilt, ...rebuiltRest } = snapshot(await ahead.rebuilt());
		expect(shownRest).toEqual(rebuiltRest);
		expect(shown?.ts).toBeGreaterThan(rebuilt?.ts ?? 0);
	});

	test("a clock a day behind still lands in order for both devices", async () => {
		const server = new FakeServer();
		server.clock.now = NOW + 12 * 60 * MINUTE;
		const behind = await openDevice(server, { name: "behind", skew: -DAY });
		const other = await openDevice(server, { name: "other" });
		await behind.signIn();
		await other.signIn();
		await behind.record(review("ba", "code2region", behind.now()));
		await other.record(review("ba", "code2region", other.now(), { correct: false }));
		await behind.sync();
		await other.sync();
		await behind.sync();
		await expectConsistent(behind, other);
	});
});

describe("a long history", () => {
	test("is pulled in several pages onto a new device", async () => {
		const { server, a, b } = await pair();
		server.limits.daily = 10_000;
		const answers = Array.from({ length: 1200 }, (_, index) =>
			review(index % 2 ? "ba" : "bb", "code2region", NOW + (index + 1) * 1000)
		);
		await a.record(...answers);
		await a.sync();
		await b.sync();
		expect(await b.ids("review_logs")).toHaveLength(1200);
		await expectConsistent(a, b);
	});

	test("is pulled completely when the server returns short pages", async () => {
		const { server, a, b } = await pair();
		await a.record(
			...Array.from({ length: 10 }, (_, index) =>
				review("ba", "code2region", NOW + (index + 1) * MINUTE)
			)
		);
		await a.sync();
		server.rowCap = 3;
		await b.sync();
		expect(await b.ids("review_logs")).toHaveLength(10);
	});

	test("is pulled completely with a small page size", async () => {
		const { a, b } = await pair();
		await a.record(
			...Array.from({ length: 25 }, (_, index) =>
				review("bb", "code2region", NOW + (index + 1) * MINUTE)
			)
		);
		await a.sync();
		const loaded = await loadState(b.db, b.store.bundle);
		if (loaded.status !== "ok") throw new Error("expected a state");
		const outcome = await runPull(
			b.db,
			b.client,
			loaded.log,
			b.store.bundle,
			b.now(),
			await wipesOf(b.db),
			4
		);
		expect(outcome.status).toBe("ok");
		expect(await b.ids("review_logs")).toHaveLength(25);
	});
});

describe("rows the server commits out of order", () => {
	// Pull history keeps each pull's end cursor, so a row numbered below it but committed after
	// that pull is never fetched again.
	test.failing("are found by a later pull", async () => {
		const { server, a, b } = await pair();
		await b.sync();
		const late = review("bb", "code2region", NOW + 2 * MINUTE, { deviceId: a.id });
		const seq = server.reserveSeq("review_logs");
		await a.record(review("ba", "code2region", NOW + MINUTE));
		await a.sync();
		await b.sync();
		server.storeWithSeq("review_logs", toWire(late.row), seq);
		server.clock.now += 6 * MINUTE;
		await b.sync();
		expect(await b.ids("review_logs")).toContain(late.row.id);
	});
});
