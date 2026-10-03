import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { readFunFacts } from "../../../src/core/content/read-fun-facts";
import { readSpecialCodes } from "../../../src/core/content/read-special-codes";

const json = async (path: string) => JSON.parse(await readFile(path, "utf8"));

describe("JSON content readers", () => {
	test("the Special Codes file yields 130 specials, three reference plates and drops doc-only keys", async () => {
		const result = readSpecialCodes(await json("data/special-codes.json"));
		expect(result.specials).toHaveLength(130);
		expect(result.referencePlates.map((plate) => [plate.id, plate.example])).toEqual([
			["ref-ri", "RI 1"],
			["ref-cc", "CC 12 10"],
			["ref-ch", "CH 130 1"]
		]);
		expect(Object.keys(result).sort()).toEqual(["referencePlates", "sources", "specials"]);
	});
	test("the Fun Facts file yields 41 ready facts with source lists", async () => {
		const result = readFunFacts(await json("data/fun-facts.json"));
		expect(result.facts).toHaveLength(41);
		expect(result.facts.every((fact) => fact.publicationStatus === "ready")).toBe(true);
		expect(result.facts[0].historyLabel).toBe("mitos");
		expect(result.facts[0].source[0]).toBe("mobilmotorlama-2018");
		expect(Object.keys(result).sort()).toEqual(["facts", "sources"]);
	});
	test("a year-only or null source date is accepted", async () => {
		const value = await json("data/fun-facts.json");
		value.sources[0].date = "2023";
		value.sources[1].date = null;
		expect(() => readFunFacts(value)).not.toThrow();
	});
	test("an invalid fact names the file and the fact id", async () => {
		const value = await json("data/fun-facts.json");
		value.facts[0].historyLabel = "legenda";
		expect(() => readFunFacts(value)).toThrow("fun-facts.json");
		expect(() => readFunFacts(value)).toThrow("fact-origin-battalion-myth");
	});
	test("an invalid special names the file", async () => {
		const value = await json("data/special-codes.json");
		value.specials[0].holder = "";
		expect(() => readSpecialCodes(value)).toThrow("special-codes.json");
	});
});
