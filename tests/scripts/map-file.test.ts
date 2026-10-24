import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../src/core/content/schema";
import { mapRules } from "../../src/core/content/rules/map";
import { readMapIds } from "../../scripts/build/map-ids";

const svg = await Bun.file(new URL("../../public/map.svg", import.meta.url)).text();
const bundle: Bundle = JSON.parse(
	await Bun.file(new URL("../../src/data/plates.json", import.meta.url)).text()
);

describe("the shipped map", () => {
	test("has an element for every coverage", () => {
		expect(mapRules(bundle, readMapIds(svg))).toEqual([]);
	});

	test("never repeats an element id", () => {
		const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("stays small enough to precache", () => {
		expect(svg.length).toBeLessThan(200_000);
	});

	test("puts every province inside its own group", () => {
		const groupOf = new Map(bundle.regions.map((region) => [region.province, region.group]));
		const placed = [...svg.matchAll(/<g data-group="([^"]+)">([\s\S]*?)<\/g>/g)].flatMap(
			([, group, body]) =>
				[...body.matchAll(/<path[^>]*\sid="([^"]+)"/g)].map(([, province]) => [
					province,
					group
				])
		);
		expect(placed).toHaveLength(groupOf.size);
		for (const [province, group] of placed) expect(groupOf.get(province)).toBe(group);
	});
});
