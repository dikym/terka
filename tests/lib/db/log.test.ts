import { describe, expect, test } from "bun:test";
import type { LearningEvent, PracticeRun, ReviewLog } from "../../../src/core/log/events";
import type { AppState } from "../../../src/core/replay/state";
import {
	lastSightingAt,
	loadState,
	readEvents,
	record,
	type LogState
} from "../../../src/lib/db/log";
import { readMeta, TerkaDb } from "../../../src/lib/db/schema";
import { ENGINE_VERSION } from "../../../src/rules";
import {
	HOUR,
	MINUTE,
	NOW,
	review,
	ruleBundle,
	run,
	sighting,
	snapshot,
	stateOf,
	voidOf
} from "../../core/replay/fixtures";
import { freshDb } from "./fixtures";

const bundle = ruleBundle();

async function opened(db: TerkaDb): Promise<LogState> {
	const result = await loadState(db, bundle);
	if (result.status !== "ok") throw new Error("expected a usable state");
	return result.log;
}

async function recorded(db: TerkaDb, log: LogState, events: LearningEvent[]): Promise<LogState> {
	const result = await record(db, log, events, bundle);
	if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
	return result.log;
}

const answers = () => [
	review("dk", "code2region", NOW),
	review("bk", "code2region", NOW + HOUR),
	review("dk", "code2region", NOW + 2 * HOUR, { correct: false, matchType: "none" })
];

// Rows a newer app wrote (by import now, by pull later), stored outside record like another tab would.
async function storeNewer(db: TerkaDb, log: LogState) {
	const newer = review("bk", "code2region", NOW + 5 * HOUR, {
		engineVersion: ENGINE_VERSION + 1
	});
	await db.review_logs.put(newer.row as ReviewLog);
	await db.sync_meta.put({ key: "logVersion", value: log.logVersion + 1 });
}

// A state no replay produces, to tell a cache hit from a fresh replay.
const marked = (state: AppState): AppState => ({
	...state,
	diagnostics: [{ eventId: "cache", reason: "marker" }]
});

describe("loading state", () => {
	test("an empty database loads the initial state and caches it", async () => {
		const db = freshDb();
		const log = await opened(db);
		expect(snapshot(log.state)).toEqual(snapshot(stateOf([])));
		expect(log.logVersion).toBe(0);
		expect((await db.derived.get("state"))?.logVersion).toBe(0);
	});
	test("recorded answers survive a reopen and equal a full replay", async () => {
		const db = freshDb();
		const events = answers();
		let log = await opened(db);
		for (const event of events) log = await recorded(db, log, [event]);
		expect(snapshot(log.state)).toEqual(snapshot(stateOf(events)));
		const reopened = await opened(new TerkaDb(db.name));
		expect(snapshot(reopened.state)).toEqual(snapshot(stateOf(events)));
		expect(await readEvents(db)).toHaveLength(3);
	});
	test("a matching cache is used as is, and the next answer is appended to it", async () => {
		const db = freshDb();
		const log = await recorded(db, await opened(db), answers());
		const row = (await db.derived.get("state"))!;
		await db.derived.put({ ...row, state: marked(row.state) });
		const reopened = await opened(db);
		expect(reopened.state.diagnostics).toEqual([{ eventId: "cache", reason: "marker" }]);
		expect(reopened.logVersion).toBe(log.logVersion);
		const after = await recorded(db, reopened, [review("bk", "code2region", NOW + 3 * HOUR)]);
		expect(after.state.diagnostics).toEqual([{ eventId: "cache", reason: "marker" }]);
	});
	test("a broken cache is replaced by a full replay without an error", async () => {
		const db = freshDb();
		const events = answers();
		await recorded(db, await opened(db), events);
		const row = (await db.derived.get("state"))!;
		await db.derived.put({ ...row, state: "broken" as unknown as AppState });
		const reopened = await opened(db);
		expect(snapshot(reopened.state)).toEqual(snapshot(stateOf(events)));
		expect((await db.derived.get("state"))!.state.cards instanceof Map).toBe(true);
	});
	test("a cache missing a state field is replaced by a full replay", async () => {
		const db = freshDb();
		const events = answers();
		await recorded(db, await opened(db), events);
		const row = (await db.derived.get("state"))!;
		const { sightings: _sightings, ...older } = row.state;
		await db.derived.put({ ...row, state: older as AppState });
		expect(snapshot((await opened(db)).state)).toEqual(snapshot(stateOf(events)));
	});
	test("a cache from another engine or content version triggers one full replay", async () => {
		for (const change of [
			{ engineVersion: ENGINE_VERSION + 1 },
			{ contentRev: bundle.contentRev + 1 }
		]) {
			const db = freshDb();
			const events = answers();
			await recorded(db, await opened(db), events);
			const row = (await db.derived.get("state"))!;
			await db.derived.put({ ...row, ...change, state: marked(row.state) });
			const reopened = await opened(db);
			expect(snapshot(reopened.state)).toEqual(snapshot(stateOf(events)));
			const rewritten = (await db.derived.get("state"))!;
			expect(rewritten.engineVersion).toBe(ENGINE_VERSION);
			expect(rewritten.contentRev).toBe(bundle.contentRev);
			expect(rewritten.state.diagnostics).toEqual([]);
		}
	});
	test("events from a newer app make the state outdated and keep the last cache", async () => {
		const db = freshDb();
		const log = await recorded(db, await opened(db), answers());
		await storeNewer(db, log);
		const result = await loadState(db, bundle);
		if (result.status !== "outdated" || !result.log)
			throw new Error("expected an outdated log");
		expect(snapshot(result.log.state)).toEqual(snapshot(log.state));
		expect(result.log).toMatchObject({ logVersion: log.logVersion + 1, outdated: true });
		await db.derived.clear();
		expect(await loadState(db, bundle)).toEqual({ status: "outdated", log: null });
	});
	test("an outdated log keeps saving answers to the outbox without caching", async () => {
		const db = freshDb();
		const events = answers();
		const log = await recorded(db, await opened(db), events);
		await storeNewer(db, log);
		const loaded = await loadState(db, bundle);
		if (loaded.status !== "outdated" || !loaded.log)
			throw new Error("expected an outdated log");
		const next = review("bk", "code2region", NOW + 6 * HOUR);
		const result = await record(db, loaded.log, [next], bundle);
		if (result.status !== "outdated")
			throw new Error(`expected outdated, got ${result.status}`);
		expect(snapshot(result.log.state)).toEqual(snapshot(stateOf([...events, next])));
		expect(await db.review_logs.get(next.row.id)).toBeDefined();
		expect((await db.outbox.toArray()).at(-1)).toMatchObject({
			key: next.row.id,
			op: "insert"
		});
		expect((await db.derived.get("state"))!.logVersion).toBe(log.logVersion);
		expect((await loadState(db, bundle)).status).toBe("outdated");
	});
});

describe("recording events", () => {
	test("each new row gets one outbox insert, a repeated row gets nothing", async () => {
		const db = freshDb();
		const [first, second] = answers();
		let log = await recorded(db, await opened(db), [first, second]);
		log = await recorded(db, log, [first]);
		expect((await db.outbox.toArray()).map((item) => [item.table, item.key, item.op])).toEqual([
			["review_logs", first.row.id, "insert"],
			["review_logs", second.row.id, "insert"]
		]);
		expect(snapshot(log.state)).toEqual(snapshot(stateOf([first, second])));
	});
	test("closing a session writes the closed row and a close item", async () => {
		const db = freshDb();
		const open = run("daily", NOW, {
			endedAt: null,
			answered: null,
			correct: null,
			activeMs: null
		});
		const closed: LearningEvent = {
			table: "practice_runs",
			row: {
				...(open.row as PracticeRun),
				endedAt: NOW + MINUTE,
				answered: 1,
				correct: 1,
				activeMs: MINUTE
			}
		};
		let log = await recorded(db, await opened(db), [open]);
		log = await recorded(db, log, [closed]);
		expect((await db.practice_runs.get(open.row.id))?.endedAt).toBe(NOW + MINUTE);
		expect((await db.outbox.toArray()).map((item) => item.op)).toEqual(["insert", "close"]);
		expect(snapshot(log.state)).toEqual(snapshot(stateOf([closed])));
	});
	test("a session that arrives already closed gets an insert and a close item", async () => {
		const db = freshDb();
		const closed = run("daily", NOW, { plannedCount: 1 });
		await recorded(db, await opened(db), [closed]);
		expect((await db.outbox.toArray()).map((item) => [item.key, item.op])).toEqual([
			[closed.row.id, "insert"],
			[closed.row.id, "close"]
		]);
	});
	test("an open session that arrives open gets only an insert item", async () => {
		const db = freshDb();
		const open = run("daily", NOW, {
			endedAt: null,
			answered: null,
			correct: null,
			activeMs: null
		});
		await recorded(db, await opened(db), [open]);
		expect((await db.outbox.toArray()).map((item) => item.op)).toEqual(["insert"]);
	});
	test("a void replays the whole log and is stored", async () => {
		const db = freshDb();
		const events = answers();
		const undo = voidOf(events[2], NOW + 2 * HOUR + MINUTE);
		const log = await recorded(db, await recorded(db, await opened(db), events), [undo]);
		expect(snapshot(log.state)).toEqual(snapshot(stateOf([...events, undo])));
		expect(await db.review_voids.count()).toBe(1);
	});
	test("a failure inside the write leaves neither the answer nor its outbox item", async () => {
		const db = freshDb();
		const log = await opened(db);
		db.outbox.hook("creating", () => {
			throw new Error("crash");
		});
		await expect(record(db, log, answers(), bundle)).rejects.toThrow();
		expect(await db.review_logs.count()).toBe(0);
		expect(await readMeta<number>(db, "logVersion")).toBeUndefined();
	});
	test("a full disk reports quota and stores nothing", async () => {
		const db = freshDb();
		const log = await opened(db);
		db.outbox.hook("creating", () => {
			throw new DOMException("disk full", "QuotaExceededError");
		});
		expect(await record(db, log, answers(), bundle)).toEqual({ status: "quota" });
		expect(await db.review_logs.count()).toBe(0);
		expect(await db.outbox.count()).toBe(0);
	});
	test("an undo saved after a newer app's rows arrived is stored, not dropped", async () => {
		const db = freshDb();
		const events = answers();
		const log = await recorded(db, await opened(db), events);
		await storeNewer(db, log);
		const undo = voidOf(events[2], NOW + 2 * HOUR + MINUTE);
		expect(await record(db, log, [undo], bundle)).toEqual({ status: "stale" });
		expect(await db.review_voids.count()).toBe(1);
	});
	test("a write from a second tab makes the first tab's state stale without losing events", async () => {
		const db = freshDb();
		const [first, second] = answers();
		const tabA = await opened(db);
		const tabB = await opened(db);
		await recorded(db, tabA, [first]);
		expect(await record(db, tabB, [second], bundle)).toEqual({ status: "stale" });
		const reloaded = await opened(db);
		expect(snapshot(reloaded.state)).toEqual(snapshot(stateOf([first, second])));
	});
});

describe("last sighting", () => {
	test("returns the latest sighting of the region on this device only", async () => {
		const db = freshDb();
		const events = [
			sighting("dk", NOW),
			sighting("dk", NOW + HOUR),
			sighting("dk", NOW + 2 * HOUR, { deviceId: "device-b" }),
			sighting("bk", NOW + 3 * HOUR)
		];
		await recorded(db, await opened(db), events);
		expect(await lastSightingAt(db, "dk", "device-a")).toBe(NOW + HOUR);
		expect(await lastSightingAt(db, "ea", "device-a")).toBeNull();
	});
});
