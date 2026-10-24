import { expect, test } from "bun:test";
import { fillStep } from "../../src/components/ui/mastery-map";
import { provinces } from "../../src/dummy/map";

test("fill step follows the legend bands", () => {
	expect([null, 0, 1, 33, 34, 66, 67, 99, 100].map(fillStep)).toEqual([
		0, 1, 2, 2, 3, 3, 4, 4, 5
	]);
});

test("dummy provinces cover every province in the map file", async () => {
	const svg = await Bun.file("public/map.svg").text();
	const ids = [...svg.matchAll(/<path[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
	expect(ids.length).toBe(38);
	for (const id of ids) expect(provinces[id]).toBeDefined();
});
