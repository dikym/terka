import { expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { specialCodeList } from "../../../src/core/reference/specials";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();

test("summarizes the diplomatic codes with the numbers missing from the list", () => {
	const list = specialCodeList(plates);
	expect(list.entries).toHaveLength(130);
	expect([list.first, list.last]).toEqual([12, 145]);
	expect(list.gaps).toEqual([46, 91, 119, 124]);
	expect(list.entries.map((entry) => Number(entry.number))).toEqual(
		[...list.entries.map((entry) => Number(entry.number))].sort((a, b) => a - b)
	);
});
