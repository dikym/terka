import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LearningEvent } from "../../src/core/log/events";
import { seeded } from "../../src/core/random";
import { ensureDevice } from "../../src/lib/db/device";
import { loadState, record, type LogState } from "../../src/lib/db/log";
import { TerkaDb } from "../../src/lib/db/schema";
import { ruleBundle } from "../../tests/core/replay/fixtures";
import { withUuids } from "../../tests/lib/db/fixtures";

// Keys of the local stack started by `bun run db:start`.
const status = JSON.parse(
	Bun.spawnSync(["bunx", "supabase", "status", "-o", "json"]).stdout.toString()
);
export const API_URL: string = status.API_URL;
const admin = createClient(API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });

export const bundle = ruleBundle();

export type Device = { db: TerkaDb; client: SupabaseClient; userId: string; deviceId: string };

// Test-only sign-in; the app signs in with Google or an email code (C3).
export async function signIn(email: string): Promise<{ client: SupabaseClient; userId: string }> {
	const password = "test-password-1";
	const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
	if (created.error && !created.error.message.includes("already")) throw created.error;
	const client = createClient(API_URL, status.ANON_KEY, { auth: { persistSession: false } });
	const signed = await client.auth.signInWithPassword({ email, password });
	if (signed.error) throw signed.error;
	return { client, userId: signed.data.user.id };
}

export const uniqueEmail = (name: string) => `${name}-${crypto.randomUUID()}@test.terka`;

// A signed-in device that owns its local data, optionally with the current consent waiting in the outbox.
export async function device(
	session: { client: SupabaseClient; userId: string },
	options: { consent?: boolean; now?: number } = {}
): Promise<Device> {
	const now = options.now ?? Date.now();
	const db = new TerkaDb(`sync-${crypto.randomUUID()}`);
	const deviceId = await ensureDevice(db, {
		now,
		random: seeded(crypto.randomUUID()),
		label: "Test",
		platform: "bun"
	});
	await db.sync_meta.put({ key: "ownerUserId", value: session.userId });
	if (options.consent !== false) {
		await db.privacy_consents.put({
			policyVersion: "2026-10-01",
			deviceId,
			consentedAt: now,
			receivedAt: null
		});
		await db.outbox.add({ table: "privacy_consents", key: "2026-10-01", op: "insert" });
	}
	return { db, ...session, deviceId };
}

// Core fixtures with uuid ids, written by this device.
export const fromDevice = (deviceId: string, events: LearningEvent[]): LearningEvent[] =>
	withUuids(events).map(
		(event) => ({ ...event, row: { ...event.row, deviceId } }) as LearningEvent
	);

export async function opened(db: TerkaDb): Promise<LogState> {
	const result = await loadState(db, bundle);
	if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
	return result.log;
}

export async function recorded(
	db: TerkaDb,
	events: LearningEvent[],
	log?: LogState
): Promise<LogState> {
	const result = await record(db, log ?? (await opened(db)), events, bundle);
	if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
	return result.log;
}

export const noRetryAfter = () => null;
