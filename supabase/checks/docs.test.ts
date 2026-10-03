import { afterAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { openDatabase } from "./database";

const db = openDatabase();
afterAll(() => db.close());

// Column names in the first cell of each dictionary table under a table heading.
function dictionary(path: string, heading: RegExp): Map<string, Set<string>> {
	const tables = new Map<string, Set<string>>();
	let table: string | null = null;
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const named = line.match(heading);
		if (named) table = named[1];
		else if (/^#/.test(line)) table = null;
		else if (table && line.startsWith("| `")) {
			const columns = tables.get(table) ?? new Set<string>();
			for (const match of line.split("|")[1].matchAll(/`([a-z_]+)`/g)) columns.add(match[1]);
			tables.set(table, columns);
		}
	}
	return tables;
}

test("every table and column the docs describe exists in the migrated schema", async () => {
	const rows: { table_name: string; column_name: string }[] = await db`
		select table_name, column_name from information_schema.columns where table_schema = 'public'`;
	const schema = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
	const described = [
		...dictionary("docs/Terka_ERD.md", /^### ([a-z_]+)$/),
		...dictionary("docs/Terka_TRD.md", /^#### `([a-z_]+)`$/)
	];
	const missing = described.flatMap(([table, columns]) =>
		[...columns].map((column) => `${table}.${column}`).filter((name) => !schema.has(name))
	);
	expect(missing).toEqual([]);
});
