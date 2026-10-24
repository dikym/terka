import { afterAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { openDatabase } from "./database";
import { pumlEntities } from "./puml";

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

test("the entity diagram matches the migrated schema", async () => {
	const columns: { table_name: string; column_name: string; is_nullable: string }[] = await db`
		select c.table_name, c.column_name, c.is_nullable
		from information_schema.columns c
		join information_schema.tables t using (table_schema, table_name)
		where c.table_schema = 'public' and t.table_type = 'BASE TABLE'`;
	const schema = new Map(
		columns.map((row) => [`${row.table_name}.${row.column_name}`, row.is_nullable === "NO"])
	);
	const tables = new Set(columns.map((row) => row.table_name));
	const entities = pumlEntities(readFileSync("docs/Terka_ERD.puml", "utf8"));
	entities.delete("auth.users");
	expect([...entities.keys()].sort()).toEqual([...tables].sort());
	const mismatched = [...entities].flatMap(([table, list]) =>
		list
			.filter(({ column, required }) => schema.get(`${table}.${column}`) !== required)
			.map(
				({ column, required }) =>
					`${table}.${column} (diagram ${required ? "NOT NULL" : "nullable"}, schema ${schema.has(`${table}.${column}`) ? (schema.get(`${table}.${column}`) ? "NOT NULL" : "nullable") : "missing"})`
			)
	);
	expect(mismatched).toEqual([]);
});
