import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { cardIdsOf, coverageRules } from "../../../src/core/content/rules/coverage";
import { bundleSchema } from "../../../src/core/content/schema";
import { ruleBundle } from "./fixtures";

describe("level three coverage in the build", () => {
	test("every creatable card of the fixture has a correct Level 3 question", () => {
		const bundle = ruleBundle();
		expect(coverageRules(bundle)).toEqual([]);
		const ids = cardIdsOf(bundle);
		expect(ids).toContain("bk::setrecall");
		expect(ids).not.toContain("bm::setrecall");
		expect(ids).toContain("cd-49-jepang::holder2special");
		expect(ids.some((id) => id.startsWith("cd-119-"))).toBe(false);
	});
	test("a card whose question cannot be built fails the build", () => {
		const bundle = ruleBundle();
		bundle.regions[0].areas.push({ areaId: "kota-hilang", confidence: "high" });
		const messages = coverageRules(bundle);
		expect(messages.map((message) => message.code)).toContain("level-three-coverage");
		expect(messages[0].message).toContain("bk::");
	});
	test("real content has level three coverage, and province names are written in full", async () => {
		const real = bundleSchema.parse(JSON.parse(await readFile("src/data/plates.json", "utf8")));
		expect(coverageRules(real)).toEqual([]);
		const names = buildDictionary(real)
			.entries.filter((entry) => entry.kind === "province")
			.map((entry) => entry.canonical);
		expect(names).toContain("Kepulauan Bangka Belitung");
		expect(names).not.toContain("Bangka Belitung");
	});
});
