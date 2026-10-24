import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { newEntry } from "../../../src/core/replay/state";
import { ruleBundle } from "../rules/fixtures";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const drill = (bundle: Bundle, code: string, pair: string) =>
	buildQuestion(
		{ ...newEntry(`${code}::code2region`), state: "review", intervalDays: 5 },
		bundle,
		{
			context: "drill",
			drillPair: pair
		}
	);

describe("compare hint", () => {
	test("names the two groups when the codes sit in different groups", () => {
		expect(drill(plates, "be", "de").hint).toEqual({
			a: { code: "BE", place: "Sumatera" },
			b: { code: "DE", place: "Maluku" }
		});
	});

	test("names the two provinces when the codes share a group", () => {
		expect(drill(plates, "bl", "bk").hint).toEqual({
			a: { code: "BL", place: "Aceh" },
			b: { code: "BK", place: "Sumatera Utara" }
		});
	});

	test("names an area only one code uses when both share a province", () => {
		const hint = drill(plates, "bk", "bb").hint!;
		const areasOf = (id: string) =>
			plates.regions
				.find((region) => region.id === id)!
				.areas.map((membership) => membership.areaId);
		const nameOf = (name: string) =>
			plates.areas.find(
				(area) =>
					area.name === name ||
					`Kota ${area.name}` === name ||
					`Kabupaten ${area.name}` === name
			)!.id;
		expect(areasOf("bk")).toContain(nameOf(hint.a.place));
		expect(areasOf("bb")).not.toContain(nameOf(hint.a.place));
		expect(areasOf("bb")).toContain(nameOf(hint.b.place));
		expect(areasOf("bk")).not.toContain(nameOf(hint.b.place));
	});

	test("falls back to a shared area when one code has none of its own", () => {
		const bundle = ruleBundle();
		bundle.regions.find((region) => region.id === "bb")!.areas = [
			{ areaId: "kota-medan", confidence: "high" }
		];
		expect(drill(bundle, "bk", "bb").hint?.b).toEqual({ code: "BB", place: "Kota Medan" });
	});

	test("keeps the hint out of the question", () => {
		const question = drill(plates, "be", "de");
		expect(question.prompt).not.toContain("Sumatera");
		expect(question.prompt).not.toContain("Maluku");
	});

	test("other questions carry no hint", () => {
		const question = buildQuestion(
			{ ...newEntry("be::code2region"), state: "review", intervalDays: 5 },
			plates,
			{ context: "daily" }
		);
		expect(question.hint ?? null).toBeNull();
	});
});
