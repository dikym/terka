import type { Bundle } from "@/core/content/schema";
import type { LearningEvent } from "@/core/log/events";
import { append, replay } from "@/core/replay/replay";
import { type AppState, initialState } from "@/core/replay/state";
import { ENGINE_VERSION } from "@/rules";
import {
	EVENT_TABLES,
	type OutboxRow,
	type Quota,
	readMeta,
	type TerkaDb,
	unlessQuota
} from "./schema";

// `outdated`: the stored log holds rows from a newer app, so the state is the last one this app
// could build; answers are still saved, but never cached.
export type LogState = { state: AppState; logVersion: number; outdated: boolean };

const logVersionOf = async (db: TerkaDb) => (await readMeta<number>(db, "logVersion")) ?? 0;

// Call inside a transaction that includes sync_meta; a newer version makes every cached state stale.
export async function bumpLogVersion(db: TerkaDb): Promise<number> {
	const next = (await logVersionOf(db)) + 1;
	await db.sync_meta.put({ key: "logVersion", value: next });
	return next;
}

export async function readEvents(db: TerkaDb): Promise<LearningEvent[]> {
	const events: LearningEvent[] = [];
	for (const table of EVENT_TABLES)
		for (const row of await db.table(table).toArray())
			events.push({ table, row } as LearningEvent);
	return events;
}

// Compares top-level fields with a fresh state, so a cache written before AppState changed shape is
// replayed. A change deeper inside AppState needs an ENGINE_VERSION bump to drop old caches.
function usable(state: unknown, bundle: Bundle): state is AppState {
	if (!state || typeof state !== "object" || !((state as AppState).cards instanceof Map))
		return false;
	const expected = Object.keys(initialState(bundle, new Set(), null))
		.sort()
		.join();
	return Object.keys(state).sort().join() === expected;
}

async function readCache(db: TerkaDb, bundle: Bundle) {
	try {
		const row = await db.derived.get("state");
		return row && usable(row.state, bundle) ? row : undefined;
	} catch {
		return undefined;
	}
}

export async function loadState(
	db: TerkaDb,
	bundle: Bundle
): Promise<{ status: "ok"; log: LogState } | { status: "outdated"; log: LogState | null }> {
	const [cache, current] = await db.transaction(
		"r",
		["derived", "sync_meta"],
		async () => [await readCache(db, bundle), await logVersionOf(db)] as const
	);
	if (
		cache &&
		cache.engineVersion === ENGINE_VERSION &&
		cache.contentRev === bundle.contentRev &&
		cache.logVersion === current
	)
		return { status: "ok", log: { state: cache.state, logVersion: current, outdated: false } };
	const { events, logVersion } = await db.transaction(
		"r",
		["sync_meta", ...EVENT_TABLES],
		async () => ({ events: await readEvents(db), logVersion: await logVersionOf(db) })
	);
	const started = performance.now();
	const result = replay(events, bundle);
	// Read by the end-to-end replay budget check; costs nothing when nobody reads it.
	performance.measure("terka:replay", { start: started, end: performance.now() });
	if (result.status === "outdated")
		return {
			status: "outdated",
			log: cache ? { state: cache.state, logVersion, outdated: true } : null
		};
	// A full disk only costs the next open another replay.
	await unlessQuota(() =>
		db.transaction("rw", ["derived", "sync_meta"], async () => {
			if ((await logVersionOf(db)) !== logVersion) return;
			await db.derived.put({
				key: "state",
				state: result.state,
				logVersion,
				engineVersion: ENGINE_VERSION,
				contentRev: bundle.contentRev
			});
		})
	);
	return { status: "ok", log: { state: result.state, logVersion, outdated: false } };
}

// Insert-only rows are written once; a session row is written again only to close it.
export async function storeEvent(
	db: TerkaDb,
	event: LearningEvent
): Promise<OutboxRow["op"] | null> {
	const existing = await db.table(event.table).get(event.row.id);
	const closes =
		event.table === "practice_runs" && existing?.endedAt === null && event.row.endedAt !== null;
	if (existing && !closes) return null;
	const op = existing ? "close" : "insert";
	await db.table(event.table).put(event.row);
	await db.outbox.add({ table: event.table, key: event.row.id, op });
	// A session is sent open and closed by a second request, also when it arrives already closed.
	if (!existing && event.table === "practice_runs" && event.row.endedAt !== null)
		await db.outbox.add({ table: event.table, key: event.row.id, op: "close" });
	return op;
}

// Null when the stored log holds rows this app cannot replay; the events are saved all the same.
async function nextState(
	db: TerkaDb,
	log: LogState,
	events: LearningEvent[],
	bundle: Bundle
): Promise<AppState | null> {
	const appended = append(log.state, events);
	if (appended !== "full") {
		if (appended.status !== "ok")
			throw new Error("events written by this app cannot be outdated");
		return appended.state;
	}
	if (log.outdated) return null;
	const result = replay([...(await readEvents(db)), ...events], bundle);
	return result.status === "ok" ? result.state : null;
}

export async function record(
	db: TerkaDb,
	log: LogState,
	events: LearningEvent[],
	bundle: Bundle
): Promise<
	| { status: "ok"; log: LogState }
	| { status: "outdated"; log: LogState }
	| { status: "stale" }
	| Quota
> {
	const next = await nextState(db, log, events, bundle);
	return unlessQuota(() =>
		db.transaction("rw", [...EVENT_TABLES, "outbox", "derived", "sync_meta"], async () => {
			const current = await logVersionOf(db);
			for (const event of events) await storeEvent(db, event);
			const logVersion = current + 1;
			await db.sync_meta.put({ key: "logVersion", value: logVersion });
			if (log.outdated)
				return {
					status: "outdated" as const,
					log: { state: next ?? log.state, logVersion, outdated: true }
				};
			if (next === null || current !== log.logVersion) return { status: "stale" as const };
			await db.derived.put({
				key: "state",
				state: next,
				logVersion,
				engineVersion: ENGINE_VERSION,
				contentRev: bundle.contentRev
			});
			return { status: "ok" as const, log: { state: next, logVersion, outdated: false } };
		})
	);
}

export async function lastSightingAt(
	db: TerkaDb,
	regionId: string,
	deviceId: string
): Promise<number | null> {
	const rows = await db.sightings
		.where("regionId")
		.equals(regionId)
		.filter((row) => row.deviceId === deviceId)
		.toArray();
	return rows.length ? Math.max(...rows.map((row) => row.clientTs)) : null;
}

// Pulled rows are already stored page by page; the state follows once per pull, by append when every
// pulled event is newer than the state and nobody else wrote meanwhile, else by one full replay.
export async function settlePulled(
	db: TerkaDb,
	log: LogState,
	pulled: LearningEvent[],
	pagesStored: number,
	bundle: Bundle
): Promise<{ status: "ok" | "outdated"; log: LogState } | { status: "stale" } | Quota> {
	if (!pulled.length) return { status: log.outdated ? "outdated" : "ok", log };
	const current = await db.transaction("r", ["sync_meta"], () => logVersionOf(db));
	const appended =
		current === log.logVersion + pagesStored && !log.outdated
			? append(log.state, pulled)
			: "full";
	const result = appended === "full" ? replay(await readEvents(db), bundle) : appended;
	if (result.status === "outdated")
		return { status: "outdated", log: { ...log, logVersion: current, outdated: true } };
	return unlessQuota(() =>
		db.transaction("rw", ["derived", "sync_meta"], async () => {
			if ((await logVersionOf(db)) !== current) return { status: "stale" as const };
			await db.derived.put({
				key: "state",
				state: result.state,
				logVersion: current,
				engineVersion: ENGINE_VERSION,
				contentRev: bundle.contentRev
			});
			return {
				status: "ok" as const,
				log: { state: result.state, logVersion: current, outdated: false }
			};
		})
	);
}
