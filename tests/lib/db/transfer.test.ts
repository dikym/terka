import { describe, expect, test } from "bun:test";
import type { ReviewLog } from "../../../src/core/log/events";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { seeded } from "../../../src/core/random";
import { ensureDevice } from "../../../src/lib/db/device";
import { loadState, record } from "../../../src/lib/db/log";
import { readMeta, type TerkaDb } from "../../../src/lib/db/schema";
import { loadNotes, loadSettings, saveNote, saveSettings } from "../../../src/lib/db/settings";
import { exportData, importData, type ImportResult } from "../../../src/lib/db/transfer";
import { ENGINE_VERSION } from "../../../src/rules";
import { NOW, params, review, ruleBundle, snapshot, stateOf } from "../../core/replay/fixtures";
import { randomLog } from "../../core/replay/generator";
import { asUuid, freshDb, unlockingSpecial, withUuids } from "./fixtures";

const bundle = ruleBundle();
const LATER = NOW + 86_400_000;

async function filled() {
	const db = freshDb();
	const deviceId = await ensureDevice(db, {
		now: NOW,
		random: seeded("device"),
		label: "Laptop",
		platform: "test"
	});
	const events = withUuids([
		...unlockingSpecial(),
		...randomLog("transfer", 120, { voids: true }),
		params(NOW, [], { status: "rejected", activatedAt: null, trainingEventIds: [asUuid("t1")] })
	]);
	const loaded = await loadState(db, bundle);
	if (loaded.status !== "ok") throw new Error("expected a usable state");
	const saved = await record(db, loaded.log, events, bundle);
	if (saved.status !== "ok") throw new Error("expected the events to be saved");
	await saveSettings(db, { scope: NATIONAL, specialEnabled: true }, { now: NOW, deviceId });
	await saveNote(db, "dk", "Denpasar", { now: NOW, deviceId });
	return { db, events, deviceId };
}

const stateAfterOpen = async (db: TerkaDb) => {
	const result = await loadState(db, bundle);
	if (result.status !== "ok") throw new Error("expected a usable state");
	return result.log.state;
};

const tablesOf = (text: string) => JSON.parse(text).tables;

function ok(result: ImportResult) {
	if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
	return result;
}

async function counts(db: TerkaDb) {
	return {
		reviews: await db.review_logs.count(),
		outbox: await db.outbox.count(),
		logVersion: await readMeta<number>(db, "logVersion"),
		derived: await db.derived.count()
	};
}

describe("export", () => {
	test("the file carries the format, versions, every table and the local training ids", async () => {
		const { db, deviceId } = await filled();
		const file = JSON.parse(await exportData(db, bundle, LATER));
		expect(file).toMatchObject({
			format: "terka-export",
			formatVersion: 4,
			exportedAt: new Date(LATER).toISOString(),
			deviceId,
			contentRev: bundle.contentRev,
			engineVersion: ENGINE_VERSION,
			quarantine: []
		});
		expect(Object.keys(file.tables)).toEqual([
			"devices",
			"privacy_consents",
			"user_settings",
			"practice_runs",
			"review_logs",
			"review_voids",
			"card_events",
			"sightings",
			"fact_views",
			"fsrs_params",
			"card_notes"
		]);
		expect(file.tables.fsrs_params[0].training_event_ids).toEqual([asUuid("t1")]);
		expect(file.tables.user_settings[0].special_enabled).toBe(true);
		expect(await readMeta<number>(db, "lastExportAt")).toBe(LATER);
	});
});

describe("import", () => {
	test("an export imported into an empty database gives the same state, settings and notes", async () => {
		const { db, events } = await filled();
		const target = freshDb();
		const result = await importData(target, await exportData(db, bundle, LATER));
		expect(result.status).toBe("ok");
		const state = await stateAfterOpen(target);
		expect(snapshot(state)).toEqual(snapshot(stateOf(events)));
		expect(state.cards.get("cd-49-jepang::holder2special")!.state).not.toBe("locked");
		expect(await loadSettings(target)).toEqual({ scope: NATIONAL, specialEnabled: true });
		expect(await loadNotes(target)).toEqual(new Map([["dk", "Denpasar"]]));
	});
	test("importing the same file twice adds nothing, and a new export has identical tables", async () => {
		const { db } = await filled();
		const text = await exportData(db, bundle, LATER);
		const target = freshDb();
		const first = ok(await importData(target, text));
		const before = await counts(target);
		const second = ok(await importData(target, text));
		expect(second.added).toEqual({});
		expect(second.existing).toEqual(first.added);
		expect((await counts(target)).outbox).toBe(before.outbox);
		expect(tablesOf(await exportData(target, bundle, LATER))).toEqual(tablesOf(text));
	});
	test("a broken or foreign file is refused whole and local data stays as it was", async () => {
		const { db } = await filled();
		const valid = JSON.parse(await exportData(db, bundle, LATER));
		const badRow = structuredClone(valid);
		badRow.tables.review_logs.at(-1).mode = "drill";
		const extraTable = { ...structuredClone(valid), tables: { ...valid.tables, users: [] } };
		const before = await counts(db);
		for (const text of [
			"{",
			"[]",
			JSON.stringify({ ...valid, format: "other-app" }),
			JSON.stringify(badRow),
			JSON.stringify(extraTable)
		]) {
			const result = await importData(db, text);
			expect(result.status).toBe("invalid");
		}
		expect(await counts(db)).toEqual(before);
	});
	test("a file of another format version is refused before anything is written", async () => {
		const { db } = await filled();
		const valid = JSON.parse(await exportData(db, bundle, LATER));
		const target = freshDb();
		for (const formatVersion of [3, 5]) {
			const result = await importData(target, JSON.stringify({ ...valid, formatVersion }));
			expect(result).toMatchObject({
				status: "invalid",
				reason: expect.stringContaining("formatVersion")
			});
		}
		expect(await target.review_logs.count()).toBe(0);
	});
	test("quarantined rows travel with the file and are never queued again", async () => {
		const { db } = await filled();
		await db.outbox_quarantine.add({
			table: "review_logs",
			key: asUuid("rejected"),
			row: { id: asUuid("rejected"), mode: "code2region" },
			error: "check constraint",
			quarantinedAt: NOW
		});
		const target = freshDb();
		const text = await exportData(db, bundle, LATER);
		await importData(target, text);
		await importData(target, text);
		expect(await target.outbox_quarantine.toArray()).toEqual([
			{
				seq: 1,
				table: "review_logs",
				key: asUuid("rejected"),
				row: { id: asUuid("rejected"), mode: "code2region" },
				error: "check constraint",
				quarantinedAt: NOW
			}
		]);
		const queued = await target.outbox.toArray();
		expect(queued.some((item) => item.key === asUuid("rejected"))).toBe(false);
	});
	test("a row listed twice in one file is added once with one outbox item", async () => {
		const { db } = await filled();
		const file = JSON.parse(await exportData(db, bundle, LATER));
		file.tables.review_logs.push(file.tables.review_logs[0]);
		const target = freshDb();
		const result = ok(await importData(target, JSON.stringify(file)));
		expect(result.existing.review_logs).toBe(1);
		const ids = (await target.outbox.toArray()).map((item) => item.key);
		expect(ids.filter((id) => id === file.tables.review_logs[0].id)).toHaveLength(1);
	});
	test("an open copy of a session never replaces the closed local one", async () => {
		const { db } = await filled();
		const file = JSON.parse(await exportData(db, bundle, LATER));
		const closed = file.tables.practice_runs[0];
		file.tables.practice_runs = [
			{
				...closed,
				ended_at: null,
				answered: null,
				correct: null,
				active_ms: null,
				score: null
			}
		];
		const result = ok(await importData(db, JSON.stringify(file)));
		expect(result.added.practice_runs).toBeUndefined();
		expect((await db.practice_runs.get(closed.id))?.endedAt).toBe(Date.parse(closed.ended_at));
	});
	test("an empty database exports a file that imports cleanly", async () => {
		const text = await exportData(freshDb(), bundle, LATER);
		expect(JSON.parse(text).deviceId).toBeNull();
		expect(await importData(freshDb(), text)).toEqual({
			status: "ok",
			added: {},
			existing: {}
		});
	});
	test("settings and notes keep the newer edit", async () => {
		const { db, deviceId } = await filled();
		const text = await exportData(db, bundle, LATER);
		const target = freshDb();
		const writer = { now: NOW + 1, deviceId: asUuid("other-device") };
		await saveSettings(target, { scope: NATIONAL, specialEnabled: false }, writer);
		await saveNote(target, "dk", "Lebih baru", writer);
		await importData(target, text);
		expect((await loadSettings(target)).specialEnabled).toBe(false);
		expect(await loadNotes(target)).toEqual(new Map([["dk", "Lebih baru"]]));
		const older = freshDb();
		await saveNote(older, "dk", "Lama", { now: NOW - 1, deviceId });
		await importData(older, text);
		expect(await loadNotes(older)).toEqual(new Map([["dk", "Denpasar"]]));
		const tie = freshDb();
		await saveNote(tie, "dk", "Sama waktu", { now: NOW, deviceId: asUuid("zzz") });
		await importData(tie, text);
		const winner = asUuid("zzz") > deviceId ? "Sama waktu" : "Denpasar";
		expect(await loadNotes(tie)).toEqual(new Map([["dk", winner]]));
	});
	test("events from a newer app are stored and the state reports outdated", async () => {
		const { db } = await filled();
		const file = JSON.parse(await exportData(db, bundle, LATER));
		const newer = withUuids([
			review("bk", "code2region", LATER, { engineVersion: ENGINE_VERSION + 1 })
		])[0].row as ReviewLog;
		file.tables.review_logs.push({
			...file.tables.review_logs[0],
			id: newer.id,
			engine_version: ENGINE_VERSION + 1
		});
		const target = freshDb();
		expect((await importData(target, JSON.stringify(file))).status).toBe("ok");
		expect(await target.review_logs.get(newer.id)).toBeDefined();
		expect((await loadState(target, bundle)).status).toBe("outdated");
	});
	test("a device label with emoji survives export and import", async () => {
		const db = freshDb();
		await ensureDevice(db, {
			now: NOW,
			random: seeded("emoji"),
			label: `${"a".repeat(39)}🚗`,
			platform: "🚗".repeat(200)
		});
		const result = await importData(freshDb(), await exportData(db, bundle, LATER));
		expect(result.status).toBe("ok");
	});
	test("a full disk reports quota and writes nothing", async () => {
		const { db } = await filled();
		const text = await exportData(db, bundle, LATER);
		const target = freshDb();
		target.outbox.hook("creating", () => {
			throw new DOMException("disk full", "QuotaExceededError");
		});
		expect(await importData(target, text)).toEqual({ status: "quota" });
		expect(await target.review_logs.count()).toBe(0);
	});
});
