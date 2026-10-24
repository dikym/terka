import { describe, expect, test } from "bun:test";
import { buildDictionary, highMembers } from "../../../src/core/answers/dictionary";
import type { Bundle } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { newEntry } from "../../../src/core/replay/state";
import { checkAnswer } from "../../../src/core/session/check";
import { alsoCorrect } from "../../../src/core/session/feedback";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const dictionary = buildDictionary(plates);
const question = (cardId: string) =>
	buildQuestion({ ...newEntry(cardId), state: "review", intervalDays: 5 }, plates, {
		context: "daily",
		level: 2
	});

describe("alsoCorrect", () => {
	test("lists up to three other areas of the code after a correct Tebak daerah", () => {
		const asked = question("bk::code2region");
		const checked = checkAnswer(asked, { text: "Medan" }, plates, dictionary);
		const others = highMembers(
			plates,
			plates.regions.find((region) => region.id === "bk")!
		)
			.filter((area) => area.id !== checked.acceptedAreaId)
			.map((area) => area.name);
		expect(alsoCorrect(plates, asked, checked)).toEqual(others.slice(0, 3));
		expect(alsoCorrect(plates, asked, checked)).not.toContain("Medan");
	});

	test("lists nothing after a wrong answer", () => {
		const asked = question("bk::code2region");
		expect(
			alsoCorrect(plates, asked, checkAnswer(asked, { text: "Padang" }, plates, dictionary))
		).toEqual([]);
	});

	test("lists nothing for Tebak kode", () => {
		const asked = question("bk::region2code");
		expect(
			alsoCorrect(plates, asked, checkAnswer(asked, { text: "BK" }, plates, dictionary))
		).toEqual([]);
	});
});
