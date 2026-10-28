import type { OutboxRow, TableName } from "@/lib/db/schema";
import type { Block } from "./errors";
import { activeBlocks } from "./status";

export const INSERT_ORDER: TableName[] = [
	"devices",
	"privacy_consents",
	"practice_runs",
	"review_logs",
	"review_voids",
	"card_events",
	"sightings",
	"fact_views",
	"fsrs_params"
];
const UPSERT_ORDER: TableName[] = ["user_settings", "card_notes"];
export const LOG_TABLES = new Set<TableName>([
	"practice_runs",
	"review_logs",
	"review_voids",
	"card_events",
	"sightings",
	"fact_views",
	"fsrs_params"
]);
const BATCH = 200;

export type Batch = { table: TableName; op: OutboxRow["op"]; items: OutboxRow[] };

// A row cannot be stored before the row it references, so it waits while that table is held.
const PARENT: Partial<Record<TableName, TableName>> = {
	review_voids: "review_logs",
	review_logs: "practice_runs",
	fact_views: "practice_runs"
};

export function isBlocked(table: TableName, blocks: Block[], now: number): boolean {
	const active = activeBlocks(blocks, now);
	const held = (name: TableName) =>
		active.some(
			(block) =>
				block.scope === "all" ||
				block.scope === name ||
				(block.scope === "logs" && LOG_TABLES.has(name))
		);
	for (let name: TableName | undefined = table; name; name = PARENT[name])
		if (held(name)) return true;
	return false;
}

// Referenced rows go first: inserts in foreign-key order, then session closes, then settings and notes.
export function planPush(outbox: OutboxRow[], blocks: Block[], now: number): Batch[] {
	const seen = new Set<string>();
	const items = [...outbox]
		.sort((a, b) => a.seq! - b.seq!)
		.filter((item) => {
			const id = `${item.table}|${item.key}|${item.op}`;
			if (seen.has(id)) return false;
			seen.add(id);
			return true;
		});
	const groups: [TableName, OutboxRow["op"]][] = [
		...INSERT_ORDER.map((table): [TableName, OutboxRow["op"]] => [table, "insert"]),
		["practice_runs", "close"],
		...UPSERT_ORDER.map((table): [TableName, OutboxRow["op"]] => [table, "upsert"])
	];
	const batches: Batch[] = [];
	for (const [table, op] of groups) {
		if (isBlocked(table, blocks, now)) continue;
		const group = items.filter((item) => item.table === table && item.op === op);
		// A close is its own request, so each one is sent and settled on its own.
		const size = op === "close" ? 1 : BATCH;
		for (let start = 0; start < group.length; start += size)
			batches.push({ table, op, items: group.slice(start, start + size) });
	}
	return batches;
}
