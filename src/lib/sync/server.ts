import type { TableName } from "@/lib/db/schema";
import { toLocal, toWire } from "@/lib/db/wire";

const CLOSING = ["ended_at", "answered", "correct", "active_ms", "score", "placement_level"];
// Filled by the server; the column grants refuse them from clients.
const SERVER_FILLED = ["received_at", "server_seq", "last_seen_at"];
// Local-only: the full id list never leaves the device that ran the optimizer.
const LOCAL_ONLY = ["training_event_ids"];

const without = (row: Record<string, unknown>, keys: readonly string[]) =>
	Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));

// PostgREST reads and writes bytea as "\x" followed by hex.
const toBytea = (hex: unknown) => (typeof hex === "string" ? `\\x${hex}` : hex);
const fromBytea = (value: unknown) =>
	typeof value === "string" && value.startsWith("\\x") ? value.slice(2) : value;

// A session is inserted open and closed by a separate update, so its insert carries no closing columns.
export function toServer(table: TableName, row: object): Record<string, unknown> {
	const wire = without(toWire(row), [...SERVER_FILLED, ...LOCAL_ONLY]);
	if (table === "fsrs_params") wire.training_set_hash = toBytea(wire.training_set_hash);
	return table === "practice_runs" ? without(wire, CLOSING) : wire;
}

export function closingOf(run: object): Record<string, unknown> {
	const wire = toWire(run);
	return Object.fromEntries(CLOSING.map((key) => [key, wire[key]]));
}

export function fromServer(
	table: TableName,
	row: Record<string, unknown>
): Record<string, unknown> {
	const local = toLocal(without(row, ["user_id"]));
	if (table === "fsrs_params") local.trainingSetHash = fromBytea(local.trainingSetHash);
	return local;
}
