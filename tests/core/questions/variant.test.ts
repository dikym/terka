import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { newEntry } from "../../../src/core/replay/state";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const ask = (variant?: number) =>
	buildQuestion({ ...newEntry("bk::code2region"), state: "learning" }, plates, {
		context: "daily",
		format: "choice",
		variant
	});

describe("question variant", () => {
	test("without a variant the question is the same every time", () => {
		expect(ask().choices).toEqual(ask().choices);
	});

	test("a variant keeps the prompt and answer but draws other options", () => {
		const first = ask();
		const again = Array.from({ length: 5 }, (_, index) => ask(index + 1));
		expect(again.every((question) => question.prompt === first.prompt)).toBe(true);
		expect(again.some((question) => question.choices.join() !== first.choices.join())).toBe(
			true
		);
		expect(again.every((question) => question.choices.length === first.choices.length)).toBe(
			true
		);
	});
});
