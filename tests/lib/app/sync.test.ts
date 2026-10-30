import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { openApp } from "../../../src/lib/app/boot";
import { createAppStore } from "../../../src/lib/app/store";
import { startSync, syncRunning, trackRound } from "../../../src/lib/app/sync";
import type { SyncSignal } from "../../../src/lib/sync/signal";
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

async function started(
	options: { afterRound?: () => Promise<void>; signal?: SyncSignal; sent?: () => number } = {}
) {
	const { afterRound, signal, sent = () => 0 } = options;
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
	const clock = { now: NOW };
	let runs = 0;
	const stop = startSync(store, {
		run: async (log) => {
			runs++;
			return { log, status: synced, nextAt: null, hold: false, sent: sent() };
		},
		afterRound,
		signal,
		now: () => clock.now,
		setTimer: h.setTimer,
		clearTimer: h.clearTimer,
		target: h.target as never,
		document: h.document as never
	});
	await Bun.sleep(0);
	return { store, h, stop, clock, runs: () => runs };
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

	test("focusing the window again syncs", async () => {
		const { h, clock, runs } = await started();
		clock.now += 15_000;
		h.listeners.get("focus")!();
		await Bun.sleep(0);
		expect(runs()).toBe(2);
	});

	test("reads what the round pulled after each round", async () => {
		let after = 0;
		await started({ afterRound: async () => void after++ });
		expect(after).toBe(1);
	});

	test("a nudge from another device syncs", async () => {
		let nudge = () => {};
		const { runs } = await started({
			signal: { listen: (onChange) => ((nudge = onChange), () => {}), announce: () => {} }
		});
		nudge();
		await Bun.sleep(0);
		expect(runs()).toBe(2);
	});

	test("only a round that sent something nudges the other devices", async () => {
		let announced = 0;
		let sent = 0;
		const signal = { listen: () => () => {}, announce: () => void announced++ };
		const { h, clock } = await started({ signal, sent: () => sent });
		expect(announced).toBe(0);
		sent = 3;
		clock.now += 15_000;
		h.listeners.get("focus")!();
		await Bun.sleep(0);
		expect(announced).toBe(1);
	});

	test("stop stops listening for nudges", async () => {
		let listening = false;
		const { stop } = await started({
			signal: {
				listen: () => ((listening = true), () => void (listening = false)),
				announce: () => {}
			}
		});
		expect(listening).toBe(true);
		stop();
		expect(listening).toBe(false);
	});

	test("stop removes the listeners", async () => {
		const { h, stop } = await started();
		stop();
		expect(h.listeners.size).toBe(0);
	});
});

describe("tracking sync rounds", () => {
	test("reports a round while it runs and not after", async () => {
		let release: () => void = () => {};
		const round = trackRound(() => new Promise<void>((resolve) => (release = resolve)));
		expect(syncRunning.get()).toBe(true);
		release();
		await round;
		expect(syncRunning.get()).toBe(false);
	});

	test("stays on until the last of two overlapping rounds ends", async () => {
		const releases: (() => void)[] = [];
		const wait = () => new Promise<void>((resolve) => releases.push(resolve));
		const first = trackRound(wait);
		const second = trackRound(wait);
		releases[0]();
		await first;
		expect(syncRunning.get()).toBe(true);
		releases[1]();
		await second;
		expect(syncRunning.get()).toBe(false);
	});

	test("goes off when a round fails", async () => {
		await expect(trackRound(() => Promise.reject(new Error("offline")))).rejects.toThrow(
			"offline"
		);
		expect(syncRunning.get()).toBe(false);
	});
});
