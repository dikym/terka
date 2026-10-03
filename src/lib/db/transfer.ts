import { z } from "zod";
import type { Bundle } from "@/core/content/schema";
import type { LearningEvent } from "@/core/log/events";
import { ENGINE_VERSION } from "@/rules";
import { storeEvent } from "./log";
import {
	type ConsentRow,
	type DeviceRow,
	EVENT_TABLES,
	type NoteRow,
	type Quota,
	type QuarantineRow,
	readMeta,
	type SettingsRow,
	type TableName,
	type TerkaDb,
	unlessQuota
} from "./schema";
import { fromWire, isTable, TABLES, toWire } from "./wire";

const FORMAT = "terka-export";
const FORMAT_VERSION = 4;

const iso = z.string().datetime({ offset: true });
const envelopeSchema = z
	.object({
		format: z.literal(FORMAT),
		formatVersion: z.literal(FORMAT_VERSION),
		exportedAt: iso,
		deviceId: z.string().nullable(),
		contentRev: z.number().int().positive(),
		engineVersion: z.number().int().positive(),
		tables: z.record(z.array(z.record(z.unknown()))),
		quarantine: z.array(
			z
				.object({
					table: z.string(),
					key: z.string().min(1),
					row: z.record(z.unknown()),
					error: z.string(),
					quarantinedAt: iso
				})
				.strict()
		)
	})
	.strict();

export async function exportData(db: TerkaDb, bundle: Bundle, now: number): Promise<string> {
	const snapshot = await db.transaction(
		"r",
		[...TABLES, "outbox_quarantine", "sync_meta"],
		async () => ({
			tables: Object.fromEntries(
				await Promise.all(
					TABLES.map(async (table) => [
						table,
						(await db.table(table).toArray()).map(toWire)
					])
				)
			),
			quarantine: await db.outbox_quarantine.toArray(),
			deviceId: (await readMeta<string>(db, "deviceId")) ?? null
		})
	);
	const text = JSON.stringify({
		format: FORMAT,
		formatVersion: FORMAT_VERSION,
		exportedAt: new Date(now).toISOString(),
		deviceId: snapshot.deviceId,
		contentRev: bundle.contentRev,
		engineVersion: ENGINE_VERSION,
		tables: snapshot.tables,
		quarantine: snapshot.quarantine.map(({ table, key, row, error, quarantinedAt }) => ({
			table,
			key,
			row,
			error,
			quarantinedAt: new Date(quarantinedAt).toISOString()
		}))
	});
	// The export reminder only loses a date when the disk is full.
	await unlessQuota(() => db.sync_meta.put({ key: "lastExportAt", value: now }));
	return text;
}

type Parsed = { rows: [TableName, unknown[]][]; quarantine: Omit<QuarantineRow, "seq">[] };

const describe = (error: z.ZodError) => {
	const issue = error.issues[0];
	return `${issue.path.join(".") || "file"}: ${issue.message}`;
};

function parseFile(text: string): Parsed | string {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return "the file is not JSON";
	}
	const envelope = envelopeSchema.safeParse(value);
	if (!envelope.success) return describe(envelope.error);
	const rows: [TableName, unknown[]][] = [];
	for (const [table, list] of Object.entries(envelope.data.tables)) {
		if (!isTable(table)) return `unknown table ${table}`;
		const parsed: unknown[] = [];
		for (const [index, row] of list.entries()) {
			const result = fromWire(table, row);
			if (!result.success) return `${table}.${index}.${describe(result.error)}`;
			parsed.push(result.data);
		}
		rows.push([table, parsed]);
	}
	const quarantine: Parsed["quarantine"] = [];
	for (const entry of envelope.data.quarantine) {
		if (!isTable(entry.table)) return `unknown quarantine table ${entry.table}`;
		quarantine.push({
			...entry,
			table: entry.table,
			quarantinedAt: Date.parse(entry.quarantinedAt)
		});
	}
	return { rows, quarantine };
}

type Edit = { updatedAt: number; updatedByDevice: string };
const isNewer = (incoming: Edit, current: Edit | undefined) =>
	!current ||
	incoming.updatedAt > current.updatedAt ||
	(incoming.updatedAt === current.updatedAt &&
		incoming.updatedByDevice > current.updatedByDevice);

// Returns whether the row was written.
async function mergeRow(db: TerkaDb, table: TableName, row: unknown): Promise<boolean> {
	if ((EVENT_TABLES as TableName[]).includes(table))
		return (await storeEvent(db, { table, row } as LearningEvent)) !== null;
	if (table === "user_settings") {
		const incoming = row as SettingsRow;
		if (!isNewer(incoming, await db.user_settings.get("me"))) return false;
		await db.user_settings.put(incoming, "me");
		await db.outbox.add({ table, key: "me", op: "upsert" });
		return true;
	}
	if (table === "card_notes") {
		const incoming = row as NoteRow;
		if (!isNewer(incoming, await db.card_notes.get(incoming.contentId))) return false;
		await db.card_notes.put(incoming);
		await db.outbox.add({ table, key: incoming.contentId, op: "upsert" });
		return true;
	}
	const key = table === "devices" ? (row as DeviceRow).id : (row as ConsentRow).policyVersion;
	if (await db.table(table).get(key)) return false;
	await db.table(table).put(row);
	await db.outbox.add({ table, key, op: "insert" });
	return true;
}

export type ImportResult =
	| { status: "ok"; added: Record<string, number>; existing: Record<string, number> }
	| { status: "invalid"; reason: string }
	| Quota;

export async function importData(db: TerkaDb, text: string): Promise<ImportResult> {
	const parsed = parseFile(text);
	if (typeof parsed === "string") return { status: "invalid", reason: parsed };
	return unlessQuota(() =>
		db.transaction(
			"rw",
			[...TABLES, "outbox", "outbox_quarantine", "derived", "sync_meta"],
			async () => {
				const added: Record<string, number> = {};
				const existing: Record<string, number> = {};
				for (const [table, rows] of parsed.rows)
					for (const row of rows) {
						const counts = (await mergeRow(db, table, row)) ? added : existing;
						counts[table] = (counts[table] ?? 0) + 1;
					}
				const held = new Set(
					(await db.outbox_quarantine.toArray()).map(
						(entry) => `${entry.table}|${entry.key}`
					)
				);
				for (const entry of parsed.quarantine) {
					const id = `${entry.table}|${entry.key}`;
					if (held.has(id)) continue;
					held.add(id);
					await db.outbox_quarantine.add(entry);
				}
				const logVersion = ((await readMeta<number>(db, "logVersion")) ?? 0) + 1;
				await db.sync_meta.put({ key: "logVersion", value: logVersion });
				await db.derived.delete("state");
				return { status: "ok" as const, added, existing };
			}
		)
	);
}
