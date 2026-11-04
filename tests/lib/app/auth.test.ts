import { afterAll, beforeAll, beforeEach, describe, expect, jest, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { settleAfterSignIn, settleOnOpen, settling, startAuth } from "@/lib/app/auth";
import type { Runtime } from "@/lib/app/runtime";
import { removeDevice, signOut } from "@/lib/auth/account";
import { loadState } from "@/lib/db/log";
import { readMeta, type TerkaDb } from "@/lib/db/schema";
import { toastStore } from "@/lib/toasts";
import { openDevice, shownMatchesStored, type Device } from "../sync/support/device";
import { answersOf, NOW, openRun } from "../sync/support/events";
import { FakeServer } from "../sync/support/server";
import { pair } from "../sync/support/world";

const later = <T>(ms: number, value: T) =>
	new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

const REMOVED_TEXT = "Perangkat ini dikeluarkan dari akun dari perangkat lain.";

async function until(check: () => boolean | Promise<boolean>) {
	for (let tries = 0; tries < 400; tries++) {
		if (await check()) return;
		await later(5, null);
	}
	throw new Error("timed out waiting");
}

describe("settling the screen after sign-in", () => {
	test("reloads only once the first round has finished", async () => {
		const steps: string[] = [];
		await settleAfterSignIn(
			later(20, null).then(() => void steps.push("synced")),
			async () => void steps.push("reloaded")
		);
		expect(steps).toEqual(["synced", "reloaded"]);
	});

	test("stops waiting for a round that takes too long and still reloads", async () => {
		const steps: string[] = [];
		const started = Date.now();
		await settleAfterSignIn(later(5_000, null), async () => void steps.push("reloaded"), 30);
		expect(steps).toEqual(["reloaded"]);
		expect(Date.now() - started).toBeLessThan(1_000);
	});

	test("reloads when the round fails", async () => {
		const steps: string[] = [];
		await settleAfterSignIn(Promise.reject(new Error("offline")), async () => {
			steps.push("reloaded");
		});
		expect(steps).toEqual(["reloaded"]);
	});

	test("holds the screens back from the first round until the reload is done", async () => {
		const seen: boolean[] = [];
		const done = settleAfterSignIn(later(20, null), async () => void seen.push(settling.get()));
		expect(settling.get()).toBe(true);
		await done;
		expect(seen).toEqual([true]);
		expect(settling.get()).toBe(false);
	});

	test("lets the screens through again when the reload itself fails", async () => {
		const done = settleAfterSignIn(Promise.resolve(), async () => {
			throw new Error("storage failed");
		});
		await expect(done).rejects.toThrow("storage failed");
		expect(settling.get()).toBe(false);
	});
});

const removedPair = async () => {
	const world = await pair();
	for (const device of [world.a, world.b, world.a]) await device.sync();
	await removeDevice(world.a.db, world.a.client, world.b.id, world.a.now());
	return world;
};

function opening(device: Device, online = true) {
	const seen = { reloads: [] as boolean[], notices: [] as string[] };
	const deps = {
		db: device.db,
		client: device.client,
		online,
		reload: async () => void seen.reloads.push(settling.get()),
		notify: (text: string) => void seen.notices.push(text)
	};
	return { seen, deps };
}

const sessionRemovedCalls = (server: FakeServer) =>
	server.calls.filter((call) => call.table === "session_removed");

const watchSettling = () => {
	const flips: boolean[] = [];
	const stop = settling.subscribe(({ active }) => flips.push(active));
	return { flips, stop };
};

describe("checking for a removal when the app opens", () => {
	test("opening a removed device signs it out before the first screen", async () => {
		const { b } = await removedPair();
		const { seen, deps } = opening(b);
		const watch = watchSettling();
		await settleOnOpen(deps);
		watch.stop();
		expect(watch.flips).toEqual([true, false]);
		expect(seen.reloads).toEqual([true]);
		expect(seen.notices).toEqual([REMOVED_TEXT]);
		expect((await b.client.auth.getSession()).data.session).toBeNull();
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
	});

	test("opening a kept device shows it signed in", async () => {
		const { a, server } = await removedPair();
		const { seen, deps } = opening(a);
		await settleOnOpen(deps);
		expect(settling.get()).toBe(false);
		expect(sessionRemovedCalls(server)).not.toEqual([]);
		expect(seen).toEqual({ reloads: [], notices: [] });
		expect(await readMeta<string>(a.db, "ownerUserId")).toBe("user-1");
	});

	test("opening offline does not wait", async () => {
		const { b, server } = await removedPair();
		const before = sessionRemovedCalls(server).length;
		const { seen, deps } = opening(b, false);
		const done = settleOnOpen(deps);
		expect(settling.get()).toBe(false);
		await done;
		expect(sessionRemovedCalls(server).length).toBe(before);
		expect(seen).toEqual({ reloads: [], notices: [] });
		expect(await readMeta<string>(b.db, "ownerUserId")).toBe("user-1");
	});

	test("opening as a guest never holds the screen", async () => {
		const server = new FakeServer();
		const guest = await openDevice(server, { name: "phone" });
		const { seen, deps } = opening(guest);
		const watch = watchSettling();
		await settleOnOpen(deps);
		watch.stop();
		expect(watch.flips).toEqual([]);
		expect(sessionRemovedCalls(server)).toEqual([]);
		expect(seen).toEqual({ reloads: [], notices: [] });
	});

	test("a slow answer stops holding the screen after three seconds", async () => {
		const db = {
			sync_meta: { get: async (key: string) => ({ key, value: "user-1" }) }
		} as unknown as TerkaDb;
		const client = {
			auth: { getSession: async () => ({ data: { session: null }, error: null }) },
			rpc: () => new Promise(() => {})
		} as unknown as SupabaseClient;
		const flush = async () => {
			for (let turn = 0; turn < 20; turn++) await Promise.resolve();
		};
		jest.useFakeTimers();
		try {
			const done = settleOnOpen({
				db,
				client,
				online: true,
				reload: async () => {},
				notify: () => {}
			});
			await flush();
			jest.advanceTimersByTime(2_999);
			await flush();
			expect(settling.get()).toBe(true);
			jest.advanceTimersByTime(1);
			await done;
			expect(settling.get()).toBe(false);
		} finally {
			jest.useRealTimers();
		}
	});

	test("a removal that answers after the wait still signs the device out", async () => {
		const { b, server } = await removedPair();
		let answer = () => {};
		const answered = new Promise<void>((resolve) => {
			answer = resolve;
		});
		server.beforeRequest = async (call) => {
			if (call.table === "session_removed") await answered;
		};
		const { seen, deps } = opening(b);
		await settleOnOpen({ ...deps, limitMs: 20 });
		expect(settling.get()).toBe(false);
		expect(seen.notices).toEqual([]);
		expect(await readMeta<string>(b.db, "ownerUserId")).toBe("user-1");
		answer();
		await until(() => seen.notices.length > 0);
		expect(seen.notices).toEqual([REMOVED_TEXT]);
		expect(seen.reloads).toEqual([false]);
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
	});

	test("a device removed while signed out stays signed in when it signs in again during the open-time check", async () => {
		const { b, server } = await removedPair();
		b.auth.userId = null;
		let answer = () => {};
		const answered = new Promise<void>((resolve) => {
			answer = resolve;
		});
		let asked = false;
		server.beforeRequest = async (call) => {
			if (call.table !== "session_removed") return;
			asked = true;
			await answered;
		};
		const { seen, deps } = opening(b);
		const done = settleOnOpen(deps);
		await until(() => asked);
		await b.signIn();
		answer();
		await done;
		expect(seen).toEqual({ reloads: [], notices: [] });
		expect((await b.client.auth.getSession()).data.session).not.toBeNull();
		expect(await readMeta<string>(b.db, "ownerUserId")).toBe("user-1");
	});
});

// The fake server's client, with the auth events and sync channel the app listens to.
function watched(device: Device) {
	let listener: ((event: string, session: unknown) => void) | null = null;
	const base = device.client as unknown as Record<string, unknown> & {
		auth: SupabaseClient["auth"];
	};
	const withUser = (session: { user: { id: string } } | null) =>
		session && { ...session, user: { ...session.user, app_metadata: {} } };
	const channel = {
		state: "closed",
		on: () => channel,
		subscribe: () => channel,
		httpSend: async () => ({ success: true })
	};
	const client = {
		...base,
		channel: () => channel,
		removeChannel: async () => "ok",
		auth: {
			...base.auth,
			onAuthStateChange(callback: (event: string, session: unknown) => void) {
				listener = callback;
				void base.auth
					.getSession()
					.then(({ data }) => callback("INITIAL_SESSION", withUser(data.session)));
				return { data: { subscription: { unsubscribe() {} } } };
			},
			async signOut() {
				await base.auth.signOut();
				listener?.("SIGNED_OUT", null);
				return { error: null };
			}
		}
	} as unknown as SupabaseClient;
	return {
		client,
		// What auth-js does when a background refresh of a revoked session fails.
		drop() {
			device.auth.userId = null;
			listener?.("SIGNED_OUT", null);
		}
	};
}

function appOf(device: Device, client: SupabaseClient, signingIn = false) {
	const counts = { reloads: 0, prefReads: 0 };
	const runtime = {
		db: device.db,
		store: device.store,
		async reload() {
			counts.reloads++;
			const loaded = await loadState(device.db, device.store.bundle);
			if (loaded.log) device.store.adopt(loaded.log, device.store.getState().sync);
		},
		refreshPrefs: async () => void counts.prefReads++
	} as unknown as Runtime;
	startAuth(runtime, { signingIn, auth: { client, retryAfter: () => null } });
	return counts;
}

const removedNotices = () =>
	toastStore.getState().items.filter((item) => item.text === REMOVED_TEXT);

describe("a removal while the app is open", () => {
	const page = new Map<string, () => void>();
	const target = {
		visibilityState: "visible",
		addEventListener: (type: string, listener: () => void) => page.set(type, listener),
		removeEventListener: (type: string) => page.delete(type)
	};
	const globals = globalThis as Record<string, unknown>;

	beforeAll(() => {
		globals.window = target;
		globals.document = target;
		Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
	});
	afterAll(() => {
		delete globals.window;
		delete globals.document;
		delete (navigator as unknown as Record<string, unknown>).onLine;
	});
	beforeEach(() => toastStore.setState({ items: [] }));

	const openWatched = async () => {
		const world = await pair();
		for (const device of [world.a, world.b, world.a]) await device.sync();
		const daily = openRun("daily", NOW, { plannedCount: 1 });
		await world.b.record(daily);
		await world.b.record(...answersOf(daily, ["ba"], NOW));
		const auth = watched(world.b);
		const counts = appOf(world.b, auth.client);
		await until(() => world.b.store.getState().sync?.state === "synced" && !settling.get());
		return { ...world, auth, counts };
	};

	test("a device whose session is dropped while open signs out when it was removed", async () => {
		const { a, b, auth, counts } = await openWatched();
		await removeDevice(a.db, a.client, b.id, a.now());
		auth.drop();
		await until(() => removedNotices().length > 0);
		expect(removedNotices().length).toBe(1);
		expect(counts.reloads).toBe(1);
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
		expect(await b.ids("review_logs")).toEqual([]);
		const [shown, stored] = await shownMatchesStored(b);
		expect(shown).toEqual(stored);
	});

	test("a removal found during sync reloads the app and shows the notice", async () => {
		const { a, b, counts } = await openWatched();
		const prefReads = counts.prefReads;
		await removeDevice(a.db, a.client, b.id, a.now());
		page.get("online")?.();
		await until(() => b.store.getState().sync?.state === "removed");
		await until(() => counts.prefReads > prefReads);
		await later(50, null);
		expect(b.store.getState().sync?.state).toBe("removed");
		expect(removedNotices().length).toBe(1);
		expect(await readMeta(b.db, "ownerUserId")).toBeUndefined();
		expect(await b.ids("review_logs")).toEqual([]);
		const [shown, stored] = await shownMatchesStored(b);
		expect(shown).toEqual(stored);
	});

	test("the open-time check does not run while a sign-in is completing", async () => {
		const { server, b } = await removedPair();
		b.auth.userId = null;
		const before = sessionRemovedCalls(server).length;
		const counts = appOf(b, watched(b).client, true);
		expect(settling.get()).toBe(false);
		await later(50, null);
		expect(sessionRemovedCalls(server).length).toBe(before);
		expect(counts.reloads).toBe(0);
		expect(removedNotices()).toEqual([]);
		expect(await readMeta<string>(b.db, "ownerUserId")).toBe("user-1");
	});

	test("signing out on this device shows no removal notice", async () => {
		const { b, auth, counts } = await openWatched();
		await signOut(b.db, auth.client, { confirmed: true, now: b.now() });
		await later(50, null);
		expect(removedNotices()).toEqual([]);
		expect(counts.reloads).toBe(0);
	});
});
