import { afterEach, describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { bootRuntime, lastDayOf, resetRuntime } from "../../../src/lib/app/runtime";
import { loadNotes, loadSettings } from "../../../src/lib/db/settings";
import { ruleBundle } from "../../core/replay/fixtures";
import { freshDb } from "../db/fixtures";

const deps = () => ({
	now: () => Date.parse("2026-10-24T08:00:00Z"),
	random: seeded("runtime"),
	userAgent: "Mozilla/5.0 (Macintosh)",
	loadContent: async () => ({ status: "ok" as const, bundle: ruleBundle() }),
	openDb: freshDb,
	storage: { persisted: async () => true, persist: async () => true }
});

afterEach(resetRuntime);

describe("runtime", () => {
	test("boots once and hands every caller the same runtime", async () => {
		const first = await bootRuntime(deps());
		const second = await bootRuntime(deps());
		expect(first.status).toBe("ready");
		expect(second).toBe(first);
	});

	test("reports content that cannot load", async () => {
		const status = await bootRuntime({
			...deps(),
			loadContent: async () => ({ status: "failed" as const })
		});
		expect(status).toEqual({ status: "contentFailed" });
	});

	test("saved settings reach the database and the prefs store", async () => {
		const status = await bootRuntime(deps());
		if (status.status !== "ready") throw new Error("not ready");
		const { runtime } = status;
		const next = { scope: { level: "group" as const, id: "jawa" }, specialEnabled: true };
		expect(await runtime.saveSettings(next)).toBe("ok");
		expect(runtime.prefs.getState().settings).toEqual(next);
		expect(await loadSettings(runtime.db)).toEqual(next);
	});

	test("a saved note is kept, and an empty one removes it", async () => {
		const status = await bootRuntime(deps());
		if (status.status !== "ready") throw new Error("not ready");
		const { runtime } = status;
		await runtime.saveNote("bk", "BK — Batak");
		expect(runtime.prefs.getState().notes.get("bk")).toBe("BK — Batak");
		await runtime.saveNote("bk", "");
		expect(runtime.prefs.getState().notes.has("bk")).toBe(false);
		expect((await loadNotes(runtime.db)).has("bk")).toBe(false);
	});

	test("the last day is known only after something was answered", async () => {
		const status = await bootRuntime(deps());
		if (status.status !== "ready") throw new Error("not ready");
		expect(lastDayOf(status.runtime.store.getState().log.state)).toBeUndefined();
		expect(
			lastDayOf({
				...status.runtime.store.getState().log.state,
				currentDay: "2026-10-24",
				lastTz: "Asia/Jakarta"
			})
		).toEqual({ localDay: "2026-10-24", tz: "Asia/Jakarta" });
	});
});
