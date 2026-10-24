import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { openApp } from "../../../src/lib/app/boot";
import { createAppStore } from "../../../src/lib/app/store";
import { bumpLogVersion } from "../../../src/lib/db/log";
import { NOW, review, ruleBundle } from "../../core/replay/fixtures";
import { freshDb, withUuids } from "../db/fixtures";

async function ready() {
	const boot = await openApp({
		now: () => NOW,
		random: seeded("store"),
		userAgent: "test",
		loadContent: async () => ({ status: "ok" as const, bundle: ruleBundle() }),
		openDb: freshDb
	});
	if (boot.status !== "ready") throw new Error("expected a ready app");
	return { boot, store: createAppStore(boot) };
}

describe("app store", () => {
	test("records an answer, advances the log and tells listeners", async () => {
		const { store } = await ready();
		let heard = 0;
		store.onRecorded(() => heard++);
		const before = store.getState().log.logVersion;
		expect(await store.record(withUuids([review("dk", "code2region", NOW)]))).toBe("ok");
		expect(store.getState().log.logVersion).toBeGreaterThan(before);
		expect(heard).toBe(1);
	});

	test("reloads the log when another tab wrote first", async () => {
		const { boot, store } = await ready();
		await bumpLogVersion(boot.db);
		expect(await store.record(withUuids([review("dk", "code2region", NOW)]))).toBe("stale");
		expect(store.getState().log.logVersion).toBe(
			await bumpLogVersion(boot.db).then((version) => version - 1)
		);
	});

	test("never adopts a sync result older than the log it already has", async () => {
		const { store } = await ready();
		const old = store.getState().log;
		await store.record(withUuids([review("dk", "code2region", NOW)]));
		store.adopt(old, null);
		expect(store.getState().log.logVersion).toBeGreaterThan(old.logVersion);
	});
});
