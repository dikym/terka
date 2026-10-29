import type { SupabaseClient } from "@supabase/supabase-js";
import { expect } from "bun:test";
import type { Bundle } from "../../../../src/core/content/schema";
import type { LearningEvent } from "../../../../src/core/log/events";
import { seeded } from "../../../../src/core/random";
import { replay } from "../../../../src/core/replay/replay";
import { openApp } from "../../../../src/lib/app/boot";
import { createAppStore } from "../../../../src/lib/app/store";
import { acceptPolicy } from "../../../../src/lib/auth/consent";
import { afterSignIn } from "../../../../src/lib/auth/signin";
import { readEvents } from "../../../../src/lib/db/log";
import { EVENT_TABLES, type TerkaDb } from "../../../../src/lib/db/schema";
import { syncNow, type SyncResult } from "../../../../src/lib/sync/sync";
import { ruleBundle, snapshot } from "../../../core/replay/fixtures";
import { freshDb } from "../../db/fixtures";
import type { FakeServer } from "./server";

export type Device = Awaited<ReturnType<typeof openDevice>>;

// Each device is a full app instance with its own database, as on two phones.
export async function openDevice(
	server: FakeServer,
	options: {
		name: string;
		skew?: number;
		online?: boolean;
		bundle?: () => Bundle;
	} = { name: "device" }
) {
	const auth: { userId: string | null; refreshFails?: boolean; expired?: boolean } = {
		userId: null
	};
	const skew = options.skew ?? 0;
	const now = () => server.clock.now + skew;
	const boot = await openApp({
		now,
		random: seeded(options.name),
		userAgent: options.name,
		loadContent: async () => ({
			status: "ok" as const,
			bundle: (options.bundle ?? ruleBundle)()
		}),
		openDb: freshDb
	});
	if (boot.status !== "ready") throw new Error("expected a ready app");
	const store = createAppStore(boot);
	const client: SupabaseClient = server.client(auth);
	const random = seeded(`${options.name}-sync`);
	let online = options.online ?? true;

	const device = {
		id: boot.deviceId,
		server,
		db: boot.db as TerkaDb,
		store,
		client,
		auth,
		now,
		setOnline: (value: boolean) => void (online = value),

		async signIn(userId = "user-1", consent = true) {
			if (consent) await acceptPolicy(boot.db, "v1", now());
			auth.userId = userId;
			return afterSignIn(boot.db, client, now());
		},

		// Events a device records always carry that device's id, as the app writes them.
		async record(...events: LearningEvent[]) {
			const owned = events.map((event) => ({
				...event,
				row: { ...event.row, deviceId: boot.deviceId }
			})) as LearningEvent[];
			return store.record(owned);
		},

		async sync(): Promise<SyncResult> {
			const result = await syncNow(
				boot.db,
				client,
				{ now: now(), random, online, retryAfter: () => null },
				store.getState().log,
				boot.bundle
			);
			store.adopt(result.log, result.status);
			return result;
		},

		state: () => store.getState().log.state,

		async ids(table: (typeof EVENT_TABLES)[number]) {
			return (await boot.db.table(table).toArray()).map((row) => String(row.id)).sort();
		},

		async outbox() {
			return boot.db.outbox.toArray();
		},

		async quarantined() {
			return boot.db.outbox_quarantine.toArray();
		},

		// The state rebuilt from every stored event, the reference the cached state must match.
		async rebuilt() {
			const result = replay(await readEvents(boot.db), boot.bundle);
			if (result.status !== "ok") throw new Error("replay is outdated");
			return result.state;
		},

		async stored(table: string, id: string) {
			return boot.db.table(table).get(id);
		}
	};
	return device;
}

export async function eventIds(device: Device): Promise<Record<string, string[]>> {
	return Object.fromEntries(
		await Promise.all(EVENT_TABLES.map(async (table) => [table, await device.ids(table)]))
	);
}

// Two devices hold the same events and read the same state from them.
export async function sameData(a: Device, b: Device) {
	return {
		events: [await eventIds(a), await eventIds(b)],
		state: [snapshot(await a.rebuilt()), snapshot(await b.rebuilt())]
	};
}

// What the app shows must equal what a fresh replay of the stored events gives.
export async function shownMatchesStored(device: Device) {
	return [snapshot(device.state()), snapshot(await device.rebuilt())];
}

// Every device holds the same events, reads the same state from them, and shows exactly that.
export async function expectConsistent(...devices: Device[]) {
	const [first, ...rest] = devices;
	const events = await eventIds(first);
	const state = snapshot(await first.rebuilt());
	for (const device of rest) {
		expect(await eventIds(device)).toEqual(events);
		expect(snapshot(await device.rebuilt())).toEqual(state);
	}
	for (const device of devices) {
		const [shown, rebuilt] = await shownMatchesStored(device);
		expect(shown).toEqual(rebuilt);
	}
}
