import { describe, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { seeded } from "../../../src/core/random";
import { claimLocalData, resetProgress, wipeLocalData } from "../../../src/lib/auth/account";
import { acceptPolicy, recordConsent } from "../../../src/lib/auth/consent";
import { ensureDevice } from "../../../src/lib/db/device";
import { bumpLogVersion, loadState, record } from "../../../src/lib/db/log";
import { readMeta, wipesOf, type TerkaDb } from "../../../src/lib/db/schema";
import { saveNote } from "../../../src/lib/db/settings";
import { runPull } from "../../../src/lib/sync/pull";
import { review, ruleBundle } from "../../core/replay/fixtures";
import { freshDb, withUuids } from "../db/fixtures";

const NOW = Date.parse("2026-10-04T08:00:00Z");
const opened = async () => {
	const db = freshDb();
	const deviceId = await ensureDevice(db, {
		now: NOW,
		random: seeded("auth"),
		label: "Laptop",
		platform: "test"
	});
	return { db, deviceId };
};

describe("claiming local data", () => {
	test("data without an owner is claimed and the device is queued for the account", async () => {
		const { db, deviceId } = await opened();
		expect(await claimLocalData(db, "user-a")).toEqual({ status: "ok", answers: 0 });
		expect(await readMeta<string>(db, "ownerUserId")).toBe("user-a");
		expect((await db.outbox.toArray()).filter((item) => item.key === deviceId)).toHaveLength(2);
	});
	test("the same account signing in again changes nothing", async () => {
		const { db } = await opened();
		await claimLocalData(db, "user-a");
		const before = await db.outbox.count();
		expect(await claimLocalData(db, "user-a")).toEqual({ status: "ok", answers: 0 });
		expect(await db.outbox.count()).toBe(before);
	});
	test("claiming records how many local answers the account takes over", async () => {
		const { db } = await opened();
		const loaded = await loadState(db, ruleBundle());
		if (loaded.status !== "ok") throw new Error("expected a usable state");
		await record(
			db,
			loaded.log,
			withUuids([
				review("dk", "code2region", NOW),
				review("bk", "code2region", NOW + 1),
				review("dk", "code2region", NOW + 2)
			]),
			ruleBundle()
		);
		expect(await claimLocalData(db, "user-a")).toEqual({ status: "ok", answers: 3 });
		expect(await readMeta<{ total: number }>(db, "claim")).toEqual({ total: 3 });
	});
	test("another account's data is never claimed", async () => {
		const { db } = await opened();
		await claimLocalData(db, "user-a");
		expect(await claimLocalData(db, "user-b")).toEqual({ status: "otherAccount" });
		expect(await readMeta<string>(db, "ownerUserId")).toBe("user-a");
	});
});

describe("consent", () => {
	test("a consent accepted before sign-in becomes a row and an outbox item once recorded", async () => {
		const { db, deviceId } = await opened();
		await acceptPolicy(db, "2026-10-01", NOW);
		await recordConsent(db, NOW);
		expect(await db.privacy_consents.toArray()).toEqual([
			{ policyVersion: "2026-10-01", deviceId, consentedAt: NOW, receivedAt: null }
		]);
		expect((await db.outbox.toArray()).at(-1)).toMatchObject({
			table: "privacy_consents",
			key: "2026-10-01"
		});
		expect(await readMeta(db, "pendingConsent")).toBeUndefined();
	});
	test("a consent accepted over an hour ago is dropped instead of recorded", async () => {
		const { db } = await opened();
		await acceptPolicy(db, "2026-10-01", NOW - 61 * 60_000);
		await recordConsent(db, NOW);
		expect(await db.privacy_consents.count()).toBe(0);
		expect(
			(await db.outbox.toArray()).filter((item) => item.table === "privacy_consents").length
		).toBe(0);
		expect(await readMeta(db, "pendingConsent")).toBeUndefined();
	});
});

describe("wiping local data", () => {
	test("everything goes except the device id and this device's row", async () => {
		const { db, deviceId } = await opened();
		await claimLocalData(db, "user-a");
		await saveNote(db, "dk", "Denpasar", { now: NOW, deviceId });
		const version = await bumpLogVersion(db);
		await wipeLocalData(db);
		expect(await readMeta<string>(db, "deviceId")).toBe(deviceId);
		expect((await db.devices.toArray()).map((row) => row.id)).toEqual([deviceId]);
		expect(await readMeta(db, "ownerUserId")).toBeUndefined();
		expect(await db.card_notes.count()).toBe(0);
		expect(await db.outbox.count()).toBe(0);
		// Other tabs still hold the old version, so it must never come back after a wipe.
		expect(await readMeta<number>(db, "logVersion")).toBeGreaterThan(version);
	});
	test("a pull already running when local data is wiped writes nothing back", async () => {
		const { db } = await opened();
		await claimLocalData(db, "user-a");
		const bundle = ruleBundle();
		const loaded = await loadState(db, bundle);
		if (!loaded.log) throw new Error("expected a log");
		const wipes = await wipesOf(db);
		const outcome = await runPull(db, wipingClient(db), loaded.log, bundle, NOW, wipes);
		expect(outcome).toEqual({ status: "wiped" });
		expect(await readMeta(db, "pullHistory")).toBeUndefined();
		expect(await readMeta(db, "policyVersions")).toBeUndefined();
	});
});

describe("resetting progress", () => {
	const learned = async () => {
		const { db, deviceId } = await opened();
		await claimLocalData(db, "user-a");
		await acceptPolicy(db, "2026-10-01", NOW);
		await recordConsent(db, NOW);
		const loaded = await loadState(db, ruleBundle());
		if (loaded.status !== "ok") throw new Error("expected a usable state");
		await record(db, loaded.log, withUuids([review("dk", "code2region", NOW)]), ruleBundle());
		await saveNote(db, "dk", "Denpasar", { now: NOW, deviceId });
		return { db, deviceId };
	};
	const rpcClient = (reply: { data: unknown; error: unknown }) =>
		({ rpc: async () => reply }) as unknown as SupabaseClient;

	test("answers, notes and waiting rows go while the device, owner and consent stay", async () => {
		const { db, deviceId } = await learned();
		expect(await resetProgress(db, rpcClient({ data: 1, error: null }))).toEqual({
			status: "ok"
		});
		expect(await db.review_logs.count()).toBe(0);
		expect(await db.card_notes.count()).toBe(0);
		expect(await db.derived.count()).toBe(0);
		expect([...new Set((await db.outbox.toArray()).map((item) => item.table))].sort()).toEqual([
			"devices",
			"privacy_consents"
		]);
		expect((await db.devices.toArray()).map((row) => row.id)).toEqual([deviceId]);
		expect(await db.privacy_consents.count()).toBe(1);
		expect(await readMeta<string>(db, "ownerUserId")).toBe("user-a");
		expect(await readMeta<number>(db, "resetEpoch")).toBe(1);
	});
	test("nothing is deleted on this device when the server refuses", async () => {
		const { db } = await learned();
		const outcome = await resetProgress(
			db,
			rpcClient({ data: null, error: { message: "offline" } })
		);
		expect(outcome).toEqual({ status: "failed" });
		expect(await db.review_logs.count()).toBe(1);
		expect(await readMeta(db, "resetEpoch")).toBeUndefined();
	});
	test("a device without an account resets without asking the server", async () => {
		const { db } = await opened();
		const loaded = await loadState(db, ruleBundle());
		if (loaded.status !== "ok") throw new Error("expected a usable state");
		await record(db, loaded.log, withUuids([review("dk", "code2region", NOW)]), ruleBundle());
		expect(await resetProgress(db, null)).toEqual({ status: "ok" });
		expect(await db.review_logs.count()).toBe(0);
		expect(await readMeta(db, "resetEpoch")).toBeUndefined();
	});
	test("the log version only grows, so open tabs see the reset", async () => {
		const { db } = await learned();
		const before = await readMeta<number>(db, "logVersion");
		await resetProgress(db, null);
		expect(await readMeta<number>(db, "logVersion")).toBeGreaterThan(before!);
		expect(await wipesOf(db)).toBe(1);
	});
});

// Answers every request with nothing, wiping local data while the first one is in flight.
function wipingClient(db: TerkaDb) {
	let wiped = false;
	const query = {
		select: () => query,
		gt: () => query,
		order: () => query,
		limit: () => query,
		retry: async () => {
			if (!wiped) {
				wiped = true;
				await wipeLocalData(db);
			}
			return { data: [], error: null, status: 200 };
		}
	};
	return { from: () => query } as unknown as SupabaseClient;
}
