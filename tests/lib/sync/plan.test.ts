import { describe, expect, test } from "bun:test";
import type { OutboxRow, TableName } from "../../../src/lib/db/schema";
import type { Block } from "../../../src/lib/sync/errors";
import { planPush } from "../../../src/lib/sync/plan";

const NOW = Date.parse("2026-10-04T12:00:00Z");
let seq = 0;
const item = (table: TableName, key: string, op: OutboxRow["op"] = "insert"): OutboxRow => ({
	seq: ++seq,
	table,
	key,
	op
});
const shape = (outbox: OutboxRow[], blocks: Block[] = []) =>
	planPush(outbox, blocks, NOW).map(
		(batch) => `${batch.op}:${batch.table}:${batch.items.length}`
	);

describe("planning a push", () => {
	test("rows go out in foreign-key order, then closes, then settings and notes", () => {
		const outbox = [
			item("card_notes", "dk", "upsert"),
			item("review_voids", "v"),
			item("review_logs", "r"),
			item("practice_runs", "s", "close"),
			item("practice_runs", "s"),
			item("user_settings", "me", "upsert"),
			item("privacy_consents", "2026-10-01"),
			item("devices", "d"),
			item("fsrs_params", "p")
		];
		expect(shape(outbox)).toEqual([
			"insert:devices:1",
			"insert:privacy_consents:1",
			"insert:practice_runs:1",
			"insert:review_logs:1",
			"insert:review_voids:1",
			"insert:fsrs_params:1",
			"close:practice_runs:1",
			"upsert:user_settings:1",
			"upsert:card_notes:1"
		]);
	});
	test("1,250 answers go out in seven batches of at most 200, oldest first", () => {
		const outbox = Array.from({ length: 1250 }, (_, index) => item("review_logs", `r${index}`));
		const batches = planPush(outbox, [], NOW);
		expect(batches.map((batch) => batch.items.length)).toEqual([
			200, 200, 200, 200, 200, 200, 50
		]);
		expect(batches[0].items[0].key).toBe("r0");
	});
	test("rows that point at a held table wait with it", () => {
		const outbox = [
			item("practice_runs", "s"),
			item("review_logs", "r"),
			item("review_voids", "v"),
			item("fact_views", "f"),
			item("sightings", "x")
		];
		expect(
			shape(outbox, [{ scope: "review_logs", until: NOW + 1, reason: "dailyLimit" }])
		).toEqual(["insert:practice_runs:1", "insert:sightings:1", "insert:fact_views:1"]);
		expect(
			shape(outbox, [{ scope: "practice_runs", until: NOW + 1, reason: "dailyLimit" }])
		).toEqual(["insert:sightings:1"]);
	});
	test("a repeated item goes out once", () => {
		expect(
			shape([item("card_notes", "dk", "upsert"), item("card_notes", "dk", "upsert")])
		).toEqual(["upsert:card_notes:1"]);
	});
	test("blocked tables wait while the rest goes out", () => {
		const outbox = [
			item("devices", "d"),
			item("privacy_consents", "v"),
			item("review_logs", "r"),
			item("sightings", "s")
		];
		expect(
			shape(outbox, [{ scope: "review_logs", until: NOW + 1, reason: "dailyLimit" }])
		).toEqual(["insert:devices:1", "insert:privacy_consents:1", "insert:sightings:1"]);
		expect(shape(outbox, [{ scope: "logs", until: null, reason: "consentNeeded" }])).toEqual([
			"insert:devices:1",
			"insert:privacy_consents:1"
		]);
		expect(shape(outbox, [{ scope: "all", until: null, reason: "totalLimit" }])).toEqual([]);
		expect(
			shape(outbox, [{ scope: "all", until: NOW - 1, reason: "deviceLimit" }])
		).toHaveLength(4);
	});
});
