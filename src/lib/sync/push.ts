import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearningEvent } from "@/core/log/events";
import { effectiveTs } from "@/core/log/order";
import { bumpLogVersion } from "@/lib/db/log";
import { readMeta, type OutboxRow, type TableName, type TerkaDb } from "@/lib/db/schema";
import { classify, type Action, type Block, type Failure } from "./errors";
import { isBlocked, LOG_TABLES, planPush, type Batch } from "./plan";
import { closingOf, toServer } from "./server";

export type PushContext = { now: number; retryAfter: () => number | null };
export type PushOutcome = { sent: number; quarantined: number; action: Action | null };
type ServerMeta = { id: string; received_at: string | null; server_seq: number | null };

const KEY_COLUMN: Partial<Record<TableName, string>> = {
	privacy_consents: "policy_version",
	card_notes: "content_id"
};
const CONFLICT: Partial<Record<TableName, string>> = {
	privacy_consents: "user_id,policy_version",
	user_settings: "user_id",
	card_notes: "user_id,content_id"
};
const HOUR = 3_600_000;

const failureOf = (error: { code?: string; message?: string }, status: number): Failure => ({
	status,
	code: error.code,
	message: error.message
});

async function localRows(db: TerkaDb, table: TableName, keys: string[]) {
	const rows = await db.table(table).bulkGet(keys);
	return keys.map((key, index) => ({
		key,
		row: rows[index] as Record<string, unknown> | undefined
	}));
}

// Rows that reference a rejected row cannot be stored either, so they leave the outbox with it.
async function dependentsOf(db: TerkaDb, table: TableName, key: string): Promise<OutboxRow[]> {
	const items = await db.outbox.toArray();
	const found: OutboxRow[] = [];
	for (const item of items) {
		if (item.table === table && item.key === key) continue;
		const row = (await db.table(item.table).get(item.key)) as
			Record<string, unknown> | undefined;
		if (!row) continue;
		const points =
			(table === "review_logs" && item.table === "review_voids" && row.reviewId === key) ||
			(table === "practice_runs" &&
				(item.table === "review_logs" || item.table === "fact_views") &&
				row.runId === key);
		if (points) found.push(item, ...(await dependentsOf(db, item.table, item.key)));
	}
	return found;
}

async function quarantine(
	db: TerkaDb,
	item: OutboxRow,
	reason: string,
	now: number
): Promise<number> {
	return db.transaction("rw", db.tables, async () => {
		// Other items for the same row, such as a session's close, can never succeed without it.
		const siblings = (await db.outbox.toArray()).filter(
			(other) =>
				other.table === item.table && other.key === item.key && other.seq !== item.seq
		);
		const items = [item, ...siblings, ...(await dependentsOf(db, item.table, item.key))];
		for (const entry of items) {
			const row = await db.table(entry.table).get(entry.key);
			await db.outbox_quarantine.add({
				table: entry.table,
				key: entry.key,
				row: toServer(entry.table, row ?? {}),
				error: entry === item ? reason : `depends on rejected ${item.table} ${item.key}`,
				quarantinedAt: now
			});
		}
		await db.outbox.bulkDelete(items.map((entry) => entry.seq!));
		return items.length;
	});
}

// Server metadata only changes replay when it moves an event's effective time, or for parameters.
async function settle(
	db: TerkaDb,
	table: TableName,
	items: OutboxRow[],
	metas: ServerMeta[],
	plannedUpTo: number
) {
	await db.transaction("rw", db.tables, async () => {
		let replayChanged = false;
		for (const meta of metas) {
			const row = (await db.table(table).get(meta.id)) as Record<string, unknown> | undefined;
			if (!row) continue;
			const receivedAt = meta.received_at === null ? null : Date.parse(meta.received_at);
			const updated = {
				...row,
				receivedAt,
				...(meta.server_seq === undefined ? {} : { serverSeq: meta.server_seq })
			};
			if (LOG_TABLES.has(table)) {
				const before = effectiveTs({ table, row } as LearningEvent);
				const after = effectiveTs({ table, row: updated } as LearningEvent);
				replayChanged ||= before !== after || table === "fsrs_params";
			}
			await db.table(table).put(updated);
		}
		// Repeats queued before this run were left out of the plan; the row just sent covers them too.
		const sent = new Set(items.map((item) => `${item.table}|${item.key}|${item.op}`));
		const repeats = (await db.outbox.toArray()).filter(
			(other) =>
				other.seq! <= plannedUpTo && sent.has(`${other.table}|${other.key}|${other.op}`)
		);
		await db.outbox.bulkDelete([...items, ...repeats].map((item) => item.seq!));
		if (replayChanged) await bumpLogVersion(db);
	});
}

async function sendInserts(db: TerkaDb, client: SupabaseClient, batch: Batch) {
	const { table } = batch;
	const keyColumn = KEY_COLUMN[table] ?? "id";
	const rows = await localRows(
		db,
		table,
		batch.items.map((item) => item.key)
	);
	const present = rows.filter((entry) => entry.row);
	const columns =
		table === "devices"
			? keyColumn
			: `${keyColumn}, received_at${table === "privacy_consents" ? "" : ", server_seq"}`;
	const response = await client
		.from(table)
		.upsert(
			present.map((entry) => toServer(table, entry.row!)),
			{ onConflict: CONFLICT[table] ?? "user_id,id", ignoreDuplicates: true }
		)
		.select(columns);
	if (response.error) return { failure: failureOf(response.error, response.status) };
	const returned = (response.data ?? []) as unknown as Record<string, unknown>[];
	const missing = present
		.map((entry) => entry.key)
		.filter((key) => !returned.some((row) => row[keyColumn] === key));
	// A resent row returns nothing; its canonical server copy still carries the metadata to keep.
	if (missing.length) {
		const canonical = await client
			.from(table)
			.select(columns)
			.in(keyColumn, missing)
			.retry(false);
		if (canonical.error) return { failure: failureOf(canonical.error, canonical.status) };
		returned.push(...((canonical.data ?? []) as unknown as Record<string, unknown>[]));
	}
	return {
		metas:
			table === "devices"
				? []
				: returned.map((row) => ({ ...row, id: row[keyColumn] }) as ServerMeta)
	};
}

async function sendClose(db: TerkaDb, client: SupabaseClient, item: OutboxRow) {
	const run = (await db.practice_runs.get(item.key)) as Record<string, unknown> | undefined;
	if (!run) return { metas: [] };
	const closing = closingOf(run);
	const response = await client
		.from("practice_runs")
		.update(closing)
		.eq("id", item.key)
		.select("id, received_at, server_seq");
	if (!response.error)
		return response.data?.length ? { metas: response.data as ServerMeta[] } : { waiting: true };
	if (response.error.code !== "TK006")
		return { failure: failureOf(response.error, response.status) };
	// A retried close is refused by the server; it succeeded if the stored close is the same one.
	const stored = await client
		.from("practice_runs")
		.select("*")
		.eq("id", item.key)
		.retry(false)
		.single();
	if (stored.error) return { failure: failureOf(stored.error, stored.status) };
	const same = Object.entries(closing).every(([column, value]) =>
		column === "ended_at"
			? Date.parse(String(stored.data.ended_at)) === Date.parse(String(value))
			: stored.data[column] === value
	);
	return same
		? { metas: [stored.data as ServerMeta] }
		: { failure: { status: 400, code: "TK006", message: "a different close is stored" } };
}

async function sendUpsert(db: TerkaDb, client: SupabaseClient, batch: Batch) {
	const { table } = batch;
	for (const item of batch.items) {
		const row = (await db.table(table).get(item.key)) as Record<string, unknown> | undefined;
		if (!row) continue;
		const response = await client
			.from(table)
			.upsert(toServer(table, row), { onConflict: CONFLICT[table] });
		if (response.error) return { failure: failureOf(response.error, response.status) };
	}
	return { metas: [] };
}

export async function runPush(
	db: TerkaDb,
	client: SupabaseClient,
	ctx: PushContext
): Promise<PushOutcome> {
	let blocks = (await readMeta<Block[]>(db, "blocks")) ?? [];
	const outcome: PushOutcome = { sent: 0, quarantined: 0, action: null };
	const outbox = await db.outbox.toArray();
	const plannedUpTo = Math.max(0, ...outbox.map((item) => item.seq!));
	const queue = planPush(outbox, blocks, ctx.now);
	while (queue.length) {
		const planned = queue.shift()!;
		if (isBlocked(planned.table, blocks, ctx.now)) continue;
		// Quarantine can take items out of the outbox after the plan was made.
		const live = await db.outbox.bulkGet(planned.items.map((item) => item.seq!));
		const batch = { ...planned, items: planned.items.filter((_, index) => live[index]) };
		if (!batch.items.length) continue;
		const result =
			batch.op === "insert"
				? await sendInserts(db, client, batch)
				: batch.op === "close"
					? await sendClose(db, client, batch.items[0])
					: await sendUpsert(db, client, batch);
		if ("waiting" in result) continue;
		if ("metas" in result && result.metas) {
			await settle(db, batch.table, batch.items, result.metas, plannedUpTo);
			outcome.sent += batch.items.length;
			if (
				batch.table === "privacy_consents" &&
				blocks.some((block) => block.reason === "consentNeeded")
			) {
				blocks = blocks.filter((block) => block.reason !== "consentNeeded");
				// The logs held back for consent were left out of the plan; plan them now.
				const held = planPush(await db.outbox.toArray(), blocks, ctx.now).filter((next) =>
					LOG_TABLES.has(next.table)
				);
				queue.push(...held);
			}
			continue;
		}
		const action = classify(result.failure!, batch.table, ctx.now, ctx.retryAfter());
		if (action.kind === "reject" || action.kind === "reconcile") {
			if (batch.items.length > 1) {
				queue.unshift(...batch.items.map((item) => ({ ...batch, items: [item] })));
				continue;
			}
			outcome.quarantined += await quarantine(
				db,
				batch.items[0],
				action.kind === "reject" ? action.reason : "a different close is stored",
				ctx.now
			);
			continue;
		}
		if (action.kind === "block") {
			blocks = [
				...blocks.filter(
					(block) => block.scope !== action.scope || block.reason !== action.reason
				),
				{
					scope: action.scope,
					until: action.until,
					reason: action.reason
				}
			];
			outcome.action ??= action;
			continue;
		}
		outcome.action = action;
		break;
	}
	await db.sync_meta.put({ key: "blocks", value: blocks });
	return outcome;
}

// The server sets last_seen_at itself; touching it once an hour keeps the device counted as active.
export async function touchDevice(db: TerkaDb, client: SupabaseClient, now: number): Promise<void> {
	const deviceId = await readMeta<string>(db, "deviceId");
	const last = (await readMeta<number>(db, "lastTouchAt")) ?? 0;
	if (!deviceId || now - last < HOUR) return;
	const touch = (extra: Record<string, unknown>) =>
		client
			.from("devices")
			.update({ last_seen_at: new Date(now).toISOString(), ...extra })
			.eq("id", deviceId);
	// A device in use is no longer a removed one. A server without the column refuses the key, and
	// the touch must go through all the same.
	let response = await touch({ removed_at: null });
	if (response.error) response = await touch({});
	if (!response.error) await db.sync_meta.put({ key: "lastTouchAt", value: now });
}
