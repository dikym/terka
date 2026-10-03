import { describe, expect, test } from "bun:test";
import Dexie from "dexie";
import { loadState } from "../../../src/lib/db/log";
import { TerkaDb } from "../../../src/lib/db/schema";
import { ruleBundle } from "../../core/replay/fixtures";

// The first Terka release kept its progress in a Dexie database named "terka" with these stores.
const previousApp = () => {
	const db = new Dexie("terka");
	db.version(1).stores({ snapshots: "id", operations: "id", local: "key" });
	return db;
};

describe("database name", () => {
	test("the default database leaves the previous app's database untouched", async () => {
		await Dexie.delete("terka");
		const old = previousApp();
		await old.table("snapshots").put({ id: "progress", revision: 1 });
		old.close();
		const db = new TerkaDb();
		await loadState(db, ruleBundle());
		db.close();
		const reopened = previousApp();
		expect(await reopened.table("snapshots").count()).toBe(1);
		reopened.close();
		await Dexie.delete("terka");
		await Dexie.delete(db.name);
	});
});
