import { describe, expect, test } from "bun:test";
import { coverageIds, mapRules } from "../../../src/core/content/rules/map";
import { ruleBundle } from "../rules/fixtures";

const bundle = ruleBundle();
const all = coverageIds(bundle);
const without = (id: string) => all.filter((item) => item !== id);
const province = bundle.regions[0].province;
const group = bundle.regions[0].group;

describe("mapRules", () => {
	test("lists the national scope, every group and every province once", () => {
		expect(all[0]).toBe("indonesia");
		expect(all).toContain(group);
		expect(all).toContain(province);
		expect(new Set(all).size).toBe(all.length);
	});

	test("accepts a map that has every coverage", () => {
		expect(mapRules(bundle, all)).toEqual([]);
	});

	test("fails once for a province without a map element", () => {
		const messages = mapRules(bundle, without(province));
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({ level: "error", code: "map-missing" });
		expect(messages[0].message).toContain(province);
	});

	test("fails for a group without a map element", () => {
		expect(mapRules(bundle, without(group))[0].message).toContain(group);
	});

	test("fails for a map without the national element", () => {
		expect(mapRules(bundle, without("indonesia"))[0].message).toContain("indonesia");
	});
});
