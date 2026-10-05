import { describe, expect, test } from "bun:test";
import type { PracticeRun } from "../../src/core/log/events";
import type { AppState } from "../../src/core/replay/state";
import { loadState, type LogState } from "../../src/lib/db/log";
import { wipesOf } from "../../src/lib/db/schema";
import { runPull } from "../../src/lib/sync/pull";
import { runPush } from "../../src/lib/sync/push";
import { toServer } from "../../src/lib/sync/server";
import { ENGINE_VERSION } from "../../src/rules";
import { HOUR, MINUTE, review, run, snapshot, stateOf } from "../../tests/core/replay/fixtures";
import {
	bundle,
	device,
	fromDevice,
	noRetryAfter,
	opened,
	recorded,
	signIn,
	uniqueEmail
} from "./harness";

const NOW = Date.now();
const push = (phone: Awaited<ReturnType<typeof device>>) =>
	runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter });

async function pulled(phone: Awaited<ReturnType<typeof device>>, log: LogState, pageSize?: number) {
	const outcome = await runPull(
		phone.db,
		phone.client,
		log,
		bundle,
		NOW,
		await wipesOf(phone.db),
		pageSize
	);
	if (outcome.status !== "ok" && outcome.status !== "outdated")
		throw new Error(`pull ended ${outcome.status}`);
	return outcome;
}

async function pair(name: string) {
	const session = await signIn(uniqueEmail(name));
	return { phone: await device(session), laptop: await device(session) };
}

// A state no replay produces, to tell an append from a full replay.
const marked = (state: AppState): AppState => ({
	...state,
	diagnostics: [{ eventId: "cache", reason: "marker" }]
});

describe("pulling other devices' rows", () => {
	test("a second device ends with the same state, and pulling again changes nothing", async () => {
		const { phone, laptop } = await pair("same");
		const events = fromDevice(phone.deviceId, [
			review("dk", "code2region", NOW - 2 * HOUR),
			review("bk", "code2region", NOW - HOUR)
		]);
		await recorded(phone.db, events);
		await push(phone);
		await push(laptop);
		const first = await pulled(laptop, await opened(laptop.db));
		expect(snapshot(first.log.state)).toEqual(snapshot(stateOf(events)));
		expect(await laptop.db.review_logs.count()).toBe(2);
		const again = await pulled(laptop, first.log);
		expect(again.log.logVersion).toBe(first.log.logVersion);
	});

	test("newer rows are appended, a row older than the state causes one full replay", async () => {
		const { phone, laptop } = await pair("append");
		await push(laptop);
		const early = fromDevice(laptop.deviceId, [review("dk", "code2region", NOW - 3 * HOUR)]);
		let log = await recorded(laptop.db, early);
		log = { ...log, state: marked(log.state) };
		await laptop.db.derived.update("state", { state: log.state });
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("bk", "code2region", NOW - HOUR)])
		);
		await push(phone);
		const appended = await pulled(laptop, log);
		expect(appended.log.state.diagnostics).toEqual([{ eventId: "cache", reason: "marker" }]);
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("ea", "code2region", NOW - 4 * HOUR)])
		);
		await push(phone);
		const replayed = await pulled(laptop, appended.log);
		expect(replayed.log.state.diagnostics).toEqual([]);
		expect(await laptop.db.review_logs.count()).toBe(3);
	});

	test("a session closed elsewhere after this device saw it open arrives through its new server_seq", async () => {
		const { phone, laptop } = await pair("close");
		const [open] = fromDevice(phone.deviceId, [
			run("daily", NOW - HOUR, {
				endedAt: null,
				answered: null,
				correct: null,
				activeMs: null
			})
		]);
		const log = await recorded(phone.db, [open]);
		await push(phone);
		await push(laptop);
		const seen = await pulled(laptop, await opened(laptop.db));
		expect((await laptop.db.practice_runs.get(open.row.id))?.endedAt).toBeNull();
		await recorded(
			phone.db,
			[
				{
					table: "practice_runs",
					row: {
						...(open.row as PracticeRun),
						endedAt: NOW - HOUR + MINUTE,
						answered: 1,
						correct: 1,
						activeMs: MINUTE
					}
				}
			],
			log
		);
		await push(phone);
		await pulled(laptop, seen.log);
		expect((await laptop.db.practice_runs.get(open.row.id))?.endedAt).toBe(NOW - HOUR + MINUTE);
	});

	test("pages are stored with their cursor, so a failure on the third page does not start over", async () => {
		const { phone, laptop } = await pair("pages");
		await recorded(
			phone.db,
			fromDevice(
				phone.deviceId,
				Array.from({ length: 7 }, (_, index) =>
					review("dk", "code2region", NOW - 3 * HOUR + index)
				)
			)
		);
		await push(phone);
		await push(laptop);
		let requests = 0;
		const original = laptop.client.from.bind(laptop.client);
		laptop.client.from = ((table: string) => {
			if (table === "review_logs" && ++requests === 3) throw new Error("connection lost");
			return original(table);
		}) as typeof laptop.client.from;
		await expect(
			runPull(
				laptop.db,
				laptop.client,
				await opened(laptop.db),
				bundle,
				NOW,
				await wipesOf(laptop.db),
				2
			)
		).rejects.toThrow("connection lost");
		expect(await laptop.db.review_logs.count()).toBe(4);
		laptop.client.from = original;
		await pulled(laptop, await opened(laptop.db), 2);
		expect(await laptop.db.review_logs.count()).toBe(7);
	});

	test("rows from a newer app are stored and the state reports outdated", async () => {
		const { phone, laptop } = await pair("newer");
		await push(laptop);
		await push(phone);
		const [newer] = fromDevice(phone.deviceId, [
			review("dk", "code2region", NOW - HOUR, { engineVersion: ENGINE_VERSION + 1 })
		]);
		const inserted = await phone.client
			.from("review_logs")
			.insert(toServer("review_logs", newer.row));
		expect(inserted.error).toBeNull();
		const outcome = await pulled(laptop, await opened(laptop.db));
		expect(outcome.status).toBe("outdated");
		expect(await laptop.db.review_logs.get(newer.row.id)).toBeDefined();
		expect((await loadState(laptop.db, bundle)).status).toBe("outdated");
	});

	test("settings follow the newer edit and the policy catalog is kept", async () => {
		const { phone, laptop } = await pair("settings");
		await phone.db.user_settings.put(
			{
				activeScopeLevel: "group",
				activeScopeId: "sumatera",
				specialEnabled: true,
				updatedAt: NOW,
				updatedByDevice: phone.deviceId,
				receivedAt: null
			},
			"me"
		);
		await phone.db.outbox.add({ table: "user_settings", key: "me", op: "upsert" });
		await push(phone);
		await push(laptop);
		await pulled(laptop, await opened(laptop.db));
		expect((await laptop.db.user_settings.get("me"))?.activeScopeId).toBe("sumatera");
		expect(
			((await laptop.db.sync_meta.get("policyVersions"))?.value as { version: string }[])[0]
				.version
		).toBe("2026-10-01");
	});

	test("a page shorter only because of the server row cap does not end the pull", async () => {
		const { phone, laptop } = await pair("cap");
		await recorded(
			phone.db,
			fromDevice(
				phone.deviceId,
				Array.from({ length: 7 }, (_, index) =>
					review("dk", "code2region", NOW - 3 * HOUR + index)
				)
			)
		);
		await push(phone);
		await push(laptop);
		const original = laptop.client.from.bind(laptop.client);
		laptop.client.from = ((table: string) => {
			const builder = original(table);
			const select = builder.select.bind(builder);
			builder.select = ((...args: Parameters<typeof select>) => {
				const query = select(...args);
				const limit = query.limit.bind(query);
				query.limit = ((count: number) => limit(Math.min(count, 2))) as typeof query.limit;
				return query;
			}) as typeof builder.select;
			return builder;
		}) as typeof laptop.client.from;
		await pulled(laptop, await opened(laptop.db), 5);
		expect(await laptop.db.review_logs.count()).toBe(7);
	});

	test("a consent given on another device lifts this device's consent block", async () => {
		const session = await signIn(uniqueEmail("consent-elsewhere"));
		const phone = await device(session, { consent: false });
		await recorded(
			phone.db,
			fromDevice(phone.deviceId, [review("dk", "code2region", NOW - HOUR)])
		);
		expect((await push(phone)).action).toMatchObject({ reason: "consentNeeded" });
		const laptop = await device(session);
		await push(laptop);
		await pulled(phone, await opened(phone.db));
		expect((await push(phone)).action).toBeNull();
		expect(await phone.db.outbox.count()).toBe(0);
	});
});
