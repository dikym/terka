import { afterAll, expect, test } from "bun:test";
import * as enums from "../../src/lib/db/enums";
import { openDatabase } from "./database";

const db = openDatabase();
afterAll(() => db.close());

const client: Record<string, Record<string, true>> = {
	"card_mode.VALUE": enums.CARD_MODES,
	"scope_level.VALUE": enums.SCOPE_LEVELS,
	"review_logs.context": enums.CONTEXTS,
	"review_logs.level_source": enums.LEVEL_SOURCES,
	"review_logs.input_mode": enums.INPUT_MODES,
	"review_logs.match_type": enums.MATCH_TYPES,
	"review_logs.question_type": enums.QUESTION_TYPES,
	"card_events.kind": enums.CARD_EVENT_KINDS,
	"fsrs_params.algorithm": enums.FSRS_ALGORITHMS,
	"fsrs_params.status": enums.FSRS_STATUSES,
	"practice_runs.kind": enums.RUN_KINDS,
	"practice_runs.placement_level": enums.TIERS
};

// An enum constraint is a whole CHECK of one column against a list, or against one value.
const LIST = /^CHECK \(\((\w+) = ANY \(ARRAY\[(.*)\]\)\)\)$/;
const SINGLE = /^CHECK \(\((\w+) = ('[^']*'::text)\)\)$/;

test("every enum the database checks lists exactly the client's values", async () => {
	const rows: { owner: string; def: string }[] = await db`
		select coalesce(t.typname, c.conrelid::regclass::text) as owner, pg_get_constraintdef(c.oid) as def
		from pg_constraint c left join pg_type t on t.oid = c.contypid
		where c.contype = 'c' and c.connamespace = 'public'::regnamespace`;
	const database: Record<string, string[]> = {};
	for (const { owner, def } of rows) {
		const match = def.match(LIST) ?? def.match(SINGLE);
		if (!match) continue;
		database[`${owner}.${match[1]}`] = [...match[2].matchAll(/'([^']*)'::text/g)]
			.map((value) => value[1])
			.sort();
	}
	const expected = Object.fromEntries(
		Object.entries(client).map(([key, values]) => [key, Object.keys(values).sort()])
	);
	expect(database).toEqual(expected);
});
