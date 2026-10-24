import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { openApp } from "../../../src/lib/app/boot";
import { createAppStore } from "../../../src/lib/app/store";
import { startSync } from "../../../src/lib/app/sync";
import type { SyncStatus } from "../../../src/lib/sync/status";
import { NOW, review, ruleBundle } from "../../core/replay/fixtures";
import { freshDb, withUuids } from "../db/fixtures";

const synced: SyncStatus = { quarantined: 0, state: "synced", lastSyncAt: NOW };

function harness() {
	const timers: { callback: () => void; ms: number; live: boolean }[] = [];
	const listeners = new Map<string, () => void>();
	const target = {
		addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
		removeEventListener: (type: string) => listeners.delete(type)
	};
	return {
		timers,
		listeners,
		target,
		document: { visibilityState: "visible" as DocumentVisibilityState, ...target },
		setTimer: (callback: () => void, ms: number) => {
			const timer = { callback, ms, live: true };
			timers.push(timer);
			return timer;
		},
		clearTimer: (handle: unknown) => {
			(handle as { live: boolean }).live = false;
		},
		fire: (ms: number) => {
			for (const timer of timers.filter((item) => item.live && item.ms === ms)) {
				timer.live = false;
				timer.callback();
			}
		}
	};
}

async function started() {
	const boot = await openApp({
		now: () => NOW,
		random: seeded("sync"),
		userAgent: "test",
		loadContent: async () => ({ status: "ok" as const, bundle: ruleBundle() }),
		openDb: freshDb
	});
	if (boot.status !== "ready") throw new Error("expected a ready app");
	const store = createAppStore(boot);
	const h = harness();
	let runs = 0;
	const stop = startSync(store, {
		run: async (log) => {
			runs++;
			return { log, status: synced, nextAt: null };
		},
		now: () => NOW,
		setTimer: h.setTimer,
		clearTimer: h.clearTimer,
		target: h.target as never,
		document: h.document as never
	});
	await Bun.sleep(0);
	return { store, h, stop, runs: () => runs };
}

describe("startSync", () => {
	test("syncs once when the app opens and adopts the status", async () => {
		const { store, runs } = await started();
		expect(runs()).toBe(1);
		expect(store.getState().sync).toEqual(synced);
	});

	test("an answer schedules a sync after the debounce", async () => {
		const { store, h, runs } = await started();
		await store.record(withUuids([review("dk", "code2region", NOW)]));
		expect(runs()).toBe(1);
		h.fire(5_000);
		await Bun.sleep(0);
		expect(runs()).toBe(2);
	});

	test("coming back online syncs", async () => {
		const { h, runs } = await started();
		h.listeners.get("online")!();
		await Bun.sleep(0);
		expect(runs()).toBe(2);
	});

	test("stop removes the listeners", async () => {
		const { h, stop } = await started();
		stop();
		expect(h.listeners.size).toBe(0);
	});
});
