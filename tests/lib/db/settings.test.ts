import { describe, expect, test } from "bun:test";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { markNoteOffer, markNotified, readFlags } from "../../../src/lib/db/flags";
import { loadNotes, loadSettings, saveNote, saveSettings } from "../../../src/lib/db/settings";
import { freshDb } from "./fixtures";

const NOW = Date.parse("2026-10-03T08:00:00Z");
const ctx = { now: NOW, deviceId: "0190a000-0000-7000-8000-000000000001" };

describe("settings", () => {
	test("a new database uses the national scope with special practice off", async () => {
		expect(await loadSettings(freshDb())).toEqual({ scope: NATIONAL, specialEnabled: false });
	});
	test("saved settings come back and queue one upsert", async () => {
		const db = freshDb();
		const settings = {
			scope: { level: "group" as const, id: "sumatera" },
			specialEnabled: true
		};
		expect(await saveSettings(db, settings, ctx)).toEqual({ status: "ok" });
		expect(await loadSettings(db)).toEqual(settings);
		expect(await db.user_settings.get("me")).toEqual({
			activeScopeLevel: "group",
			activeScopeId: "sumatera",
			specialEnabled: true,
			updatedAt: NOW,
			updatedByDevice: ctx.deviceId,
			receivedAt: null
		});
		expect(await db.outbox.toArray()).toEqual([
			{ seq: 1, table: "user_settings", key: "me", op: "upsert" }
		]);
	});
	test("the national scope is stored without an id and read back as national", async () => {
		const db = freshDb();
		await saveSettings(db, { scope: NATIONAL, specialEnabled: false }, ctx);
		expect((await db.user_settings.get("me"))?.activeScopeId).toBeNull();
		expect((await loadSettings(db)).scope).toEqual(NATIONAL);
	});
	test("a full disk reports quota and keeps the old settings", async () => {
		const db = freshDb();
		db.outbox.hook("creating", () => {
			throw new DOMException("disk full", "QuotaExceededError");
		});
		expect(await saveSettings(db, { scope: NATIONAL, specialEnabled: true }, ctx)).toEqual({
			status: "quota"
		});
		expect(await db.user_settings.count()).toBe(0);
	});
});

describe("notes", () => {
	test("a note is stored with its writer and queues an upsert", async () => {
		const db = freshDb();
		await saveNote(db, "dk", "Denpasar", ctx);
		expect(await loadNotes(db)).toEqual(new Map([["dk", "Denpasar"]]));
		expect((await db.outbox.toArray()).map((item) => [item.table, item.key, item.op])).toEqual([
			["card_notes", "dk", "upsert"]
		]);
	});
	test("280 characters fit, 281 are refused before anything is written", async () => {
		const db = freshDb();
		await saveNote(db, "dk", "a".repeat(280), ctx);
		expect(() => saveNote(db, "bk", "a".repeat(281), ctx)).toThrow("280");
		expect(await db.card_notes.count()).toBe(1);
	});
	test("characters are counted as code points", async () => {
		expect(await saveNote(freshDb(), "dk", "🚗".repeat(280), ctx)).toEqual({ status: "ok" });
	});
	test("an empty note keeps its row but is hidden", async () => {
		const db = freshDb();
		await saveNote(db, "dk", "Denpasar", ctx);
		await saveNote(db, "dk", "", { ...ctx, now: NOW + 1 });
		expect(await loadNotes(db)).toEqual(new Map());
		expect((await db.card_notes.get("dk"))?.body).toBe("");
	});
});

describe("display flags", () => {
	test("notified keys and note offers are remembered", async () => {
		const db = freshDb();
		await markNotified(db, ["dk::code2region|leech|8"]);
		await markNoteOffer(db, "dk", 4);
		await markNoteOffer(db, "dk", 4);
		await markNoteOffer(db, "dk", 6);
		expect(await readFlags(db)).toEqual({
			notified: new Set(["dk::code2region|leech|8"]),
			noteOffers: new Map([["dk", [4, 6]]])
		});
	});
});
