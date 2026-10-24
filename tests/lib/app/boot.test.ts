import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { openApp } from "../../../src/lib/app/boot";
import { readMeta, TerkaDb } from "../../../src/lib/db/schema";
import { ruleBundle } from "../../core/replay/fixtures";
import { freshDb } from "../db/fixtures";

const NOW = Date.parse("2026-10-24T08:00:00Z");
const deps = (overrides: Partial<Parameters<typeof openApp>[0]> = {}) => ({
	now: () => NOW,
	random: seeded("boot"),
	userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
	loadContent: async () => ({ status: "ok" as const, bundle: ruleBundle() }),
	openDb: freshDb,
	storage: { persisted: async () => false, persist: async () => true },
	...overrides
});

describe("openApp", () => {
	test("opens the content, registers the device and loads the log", async () => {
		const boot = await openApp(deps());
		expect(boot.status).toBe("ready");
		if (boot.status !== "ready") return;
		expect(boot.deviceId).toBe((await readMeta<string>(boot.db, "deviceId"))!);
		expect((await boot.db.devices.get(boot.deviceId))?.label).toBe("iPhone");
		expect(boot.persisted).toBe(true);
		expect(boot.log.state.cards.size).toBeGreaterThan(0);
	});

	test("stops before touching storage when the content cannot load", async () => {
		let opened = false;
		const boot = await openApp(
			deps({
				loadContent: async () => ({ status: "failed" as const }),
				openDb: () => {
					opened = true;
					return freshDb();
				}
			})
		);
		expect(boot).toEqual({ status: "contentFailed" });
		expect(opened).toBe(false);
	});

	test("reports unreadable storage without writing", async () => {
		const broken = () => {
			const db = new TerkaDb(`broken-${crypto.randomUUID()}`);
			db.open = () => Promise.reject(new Error("IndexedDB unavailable")) as never;
			db.transaction = (() => Promise.reject(new Error("IndexedDB unavailable"))) as never;
			return db;
		};
		expect(await openApp(deps({ openDb: broken }))).toEqual({ status: "storageFailed" });
	});

	test("keeps working when persistent storage is refused", async () => {
		const boot = await openApp(
			deps({ storage: { persisted: async () => false, persist: async () => false } })
		);
		expect(boot).toMatchObject({ status: "ready", persisted: false });
	});
});
