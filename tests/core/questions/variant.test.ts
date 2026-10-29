import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { newEntry } from "../../../src/core/replay/state";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const ask = (variant?: number, salt?: string, cardId = "bk::code2region") =>
	buildQuestion({ ...newEntry(cardId), state: "learning" }, plates, {
		context: "daily",
		format: "choice",
		variant,
		salt
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

	test("a salt gives the same question for the same salt and new ones for other salts", () => {
		expect(ask(undefined, "a")).toEqual(ask(undefined, "a"));
		const salts = Array.from({ length: 8 }, (_, index) => `run-${index}`);
		const options = salts.map((salt) => ask(undefined, salt).choices.join());
		const prompts = salts.map((salt) => ask(undefined, salt, "bk::region2code").prompt);
		expect(new Set(options).size).toBeGreaterThan(1);
		expect(new Set(prompts).size).toBeGreaterThan(1);
	});
});
