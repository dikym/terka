import { describe, expect, test } from "bun:test";
import { claimFacts } from "../../../src/lib/sync/sync";
import { freshDb } from "../db/fixtures";

describe("claim progress", () => {
	test("is absent without a claim", async () => {
		expect(await claimFacts(freshDb())).toBeNull();
	});

	test("counts the answers still waiting in the outbox", async () => {
		const db = freshDb();
		await db.sync_meta.put({ key: "claim", value: { total: 3 } });
		await db.outbox.bulkAdd([
			{ table: "review_logs", key: "a", op: "insert" },
			{ table: "review_logs", key: "b", op: "insert" },
			{ table: "sightings", key: "c", op: "insert" }
		]);
		expect(await claimFacts(db)).toEqual({ total: 3, pending: 2 });
	});

	test("forgets a claim once no answer is waiting", async () => {
		const db = freshDb();
		await db.sync_meta.put({ key: "claim", value: { total: 3 } });
		expect(await claimFacts(db)).toBeNull();
		expect(await db.sync_meta.get("claim")).toBeUndefined();
	});
});
