import type { SupabaseClient } from "@supabase/supabase-js";
import type { Bundle } from "@/core/content/schema";
import type { LearningEvent } from "@/core/log/events";
import { deviceInfoOf } from "@/lib/db/device";
import { bumpLogVersion, settlePulled, type LogState } from "@/lib/db/log";
import {
	EVENT_TABLES,
	readMeta,
	wipesOf,
	type ConsentRow,
	type DeviceRow,
	type EventTable,
	type NoteRow,
	type Quota,
	type SettingsRow,
	type TableName,
	type TerkaDb
} from "@/lib/db/schema";
import { toLocal } from "@/lib/db/wire";
import { classify, type Action, type Block } from "./errors";
import { fromServer } from "./server";

export type PullEntry = { startedAt: number; cursor: number };
export type PullOutcome =
	| { status: "ok" | "outdated"; log: LogState; action: Action | null }
	| { status: "stale" | "wiped" }
	| Quota;

const OVERLAP_MS = 5 * 60_000;
const PAGE = 1000;

// Rows that commit out of server_seq order are caught by restarting from a pull at least 5 minutes old.
export function pullStart(
	history: PullEntry[],
	startedAt: number
): { cursor: number; history: PullEntry[] } {
	const sorted = [...history].sort((a, b) => a.startedAt - b.startedAt || a.cursor - b.cursor);
	const old = sorted.filter((entry) => entry.startedAt <= startedAt - OVERLAP_MS);
	const chosen = old.at(-1) ?? sorted[0];
	if (!chosen) return { cursor: 0, history: [] };
	return { cursor: chosen.cursor, history: sorted.slice(sorted.indexOf(chosen)) };
}

const unwiped = async (db: TerkaDb, wipes: number) => (await wipesOf(db)) === wipes;

const newer = (
	a: { updatedAt: number; updatedByDevice: string },
	b: { updatedAt: number; updatedByDevice: string }
) =>
	a.updatedAt > b.updatedAt ||
	(a.updatedAt === b.updatedAt && a.updatedByDevice > b.updatedByDevice);

// Keeps rows the device does not have yet, server metadata it lacks, and closes it has not seen.
async function storePage(
	db: TerkaDb,
	table: EventTable,
	rows: Record<string, unknown>[],
	history: Record<string, PullEntry[]>,
	wipes: number
): Promise<LearningEvent[] | null> {
	return db.transaction("rw", [table, "sync_meta"], async () => {
		if (!(await unwiped(db, wipes))) return null;
		const changed: LearningEvent[] = [];
		for (const row of rows) {
			const existing = (await db.table(table).get(row.id as string)) as
				Record<string, unknown> | undefined;
			const closes =
				table === "practice_runs" && existing?.endedAt === null && row.endedAt !== null;
			const informs =
				existing &&
				(existing.receivedAt !== row.receivedAt || existing.serverSeq !== row.serverSeq);
			if (existing && !closes && !informs) continue;
			const stored = !existing
				? row
				: closes
					? { ...existing, ...row }
					: { ...existing, receivedAt: row.receivedAt, serverSeq: row.serverSeq };
			await db.table(table).put(stored);
			changed.push({ table, row: stored } as LearningEvent);
		}
		// The cursor is saved with its rows, so an interrupted pull resumes after the last stored page.
		await db.sync_meta.put({ key: "pullHistory", value: history });
		if (changed.length) await bumpLogVersion(db);
		return changed;
	});
}

async function pullWhole(
	db: TerkaDb,
	client: SupabaseClient,
	now: number,
	wipes: number
): Promise<Action | null | "wiped"> {
	const [settings, notes, devices, consents, versions] = await Promise.all([
		client.from("user_settings").select("*").retry(false),
		client.from("card_notes").select("*").retry(false),
		client.from("devices").select("*").retry(false),
		client.from("privacy_consents").select("*").retry(false),
		client.from("privacy_policy_versions").select("*").retry(false)
	]);
	for (const response of [settings, notes, devices, consents, versions])
		if (response.error)
			return classify({ status: response.status, ...response.error }, "user_settings", now);
	return db.transaction(
		"rw",
		["user_settings", "card_notes", "devices", "privacy_consents", "sync_meta"],
		async () => {
			if (!(await unwiped(db, wipes))) return "wiped" as const;
			const local = (table: TableName, row: Record<string, unknown>) =>
				fromServer(table, row);
			for (const row of settings.data!) {
				const server = local("user_settings", row) as SettingsRow;
				const mine = await db.user_settings.get("me");
				if (!mine || !newer(mine, server)) await db.user_settings.put(server, "me");
			}
			for (const row of notes.data!) {
				const server = local("card_notes", row) as NoteRow;
				const mine = await db.card_notes.get(server.contentId);
				if (!mine || !newer(mine, server)) await db.card_notes.put(server);
			}
			for (const row of devices.data!) {
				const server = local("devices", row) as DeviceRow;
				if (!(await db.devices.get(server.id))) await db.devices.put(server);
			}
			await db.sync_meta.put({
				key: "deviceList",
				value: devices.data!.map((row) => deviceInfoOf(row))
			});
			for (const row of consents.data!) {
				const server = local("privacy_consents", row) as ConsentRow;
				if (!(await db.privacy_consents.get(server.policyVersion)))
					await db.privacy_consents.put(server);
			}
			// The account consented on another device: logs held for consent may go now.
			const required = versions
				.data!.filter((row) => row.requires_reconsent)
				.sort(
					(x, y) => Date.parse(y.published_at) - Date.parse(x.published_at)
				)[0]?.version;
			if (required && consents.data!.some((row) => row.policy_version === required)) {
				const blocks = (await readMeta<Block[]>(db, "blocks")) ?? [];
				await db.sync_meta.put({
					key: "blocks",
					value: blocks.filter((block) => block.reason !== "consentNeeded")
				});
			}
			await db.sync_meta.put({
				key: "policyVersions",
				value: versions.data!.map((row) => toLocal(row))
			});
			return null;
		}
	);
}

export async function runPull(
	db: TerkaDb,
	client: SupabaseClient,
	log: LogState,
	bundle: Bundle,
	now: number,
	wipes: number,
	pageSize = PAGE
): Promise<PullOutcome> {
	const started = await db.transaction("rw", ["sync_meta"], async () => {
		if (!(await unwiped(db, wipes))) return false;
		await db.sync_meta.put({ key: "lastPullStartedAt", value: now });
		return true;
	});
	if (!started) return { status: "wiped" };
	const history = (await readMeta<Record<string, PullEntry[]>>(db, "pullHistory")) ?? {};
	const pulled: LearningEvent[] = [];
	let pages = 0;
	let action: Action | null = null;
	tables: for (const table of EVENT_TABLES) {
		const start = pullStart(history[table] ?? [], now);
		let cursor = start.cursor;
		// Every pull leaves an entry, so a later pull can find one at least 5 minutes old.
		history[table] = [...start.history, { startedAt: now, cursor }];
		for (;;) {
			const response = await client
				.from(table)
				.select("*")
				.gt("server_seq", cursor)
				.order("server_seq")
				.limit(pageSize)
				// The scheduler owns retries; built-in GET retries would stack a second backoff.
				.retry(false);
			if (response.error) {
				action = classify({ status: response.status, ...response.error }, table, now);
				break tables;
			}
			// Only an empty page ends the table: a server row cap can shorten pages below pageSize.
			if (!response.data.length) break;
			cursor = response.data.at(-1)!.server_seq as number;
			history[table] = [...start.history, { startedAt: now, cursor }];
			const changed = await storePage(
				db,
				table,
				response.data.map((row) => fromServer(table, row)),
				history,
				wipes
			);
			if (!changed) return { status: "wiped" };
			if (changed.length) pages += 1;
			pulled.push(...changed);
		}
	}
	const kept = await db.transaction("rw", ["sync_meta"], async () => {
		if (!(await unwiped(db, wipes))) return false;
		await db.sync_meta.put({ key: "pullHistory", value: history });
		return true;
	});
	if (!kept) return { status: "wiped" };
	if (!action) {
		const whole = await pullWhole(db, client, now, wipes);
		if (whole === "wiped") return { status: "wiped" };
		action = whole;
	}
	const settled = await settlePulled(db, log, pulled, pages, bundle);
	if (settled.status === "stale" || settled.status === "quota") return settled;
	return { ...settled, action };
}
