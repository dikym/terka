import { describe, expect, test } from "bun:test";
import { buildQuestion } from "../../../src/core/questions/build";
import type { Question } from "../../../src/core/questions/question";
import { newEntry } from "../../../src/core/replay/state";
import { checkAnswer } from "../../../src/core/session/check";
import { ruleBundle } from "../replay/fixtures";
import { dictionary } from "./fixtures";

const bundle = ruleBundle();
const typed = (cardId: string, context: Question["context"] = "daily") =>
	buildQuestion({ ...newEntry(cardId), state: "review", intervalDays: 5 }, bundle, { context });
const check = (question: Question, response: Parameters<typeof checkAnswer>[1]) =>
	checkAnswer(question, response, bundle, dictionary);

describe("single answers", () => {
	test("a member name is correct and a name of another code records the confusion", () => {
		const question = typed("bk::code2region");
		expect(check(question, { text: "Kab. Deli Serdang" })).toMatchObject({
			correct: true,
			matchType: "exact",
			acceptedAreaId: "kab-deli-serdang"
		});
		expect(check(question, { text: "Sibolga" })).toMatchObject({
			correct: false,
			confusedWith: "bb"
		});
	});
	test("a member with an unverified membership is not graded", () => {
		expect(check(typed("bk::code2region"), { text: "Langkat" })).toMatchObject({
			correct: null,
			matchType: "unverified"
		});
	});
	test("an area shared by two codes accepts either code without a confusion", () => {
		const question: Question = {
			...typed("a::region2code"),
			answer: { kind: "region-code", areaId: "kab-tangerang", codeIds: ["a", "b"] }
		};
		expect(check(question, { text: "b" })).toMatchObject({ correct: true, confusedWith: null });
		expect(check(question, { text: "BK" })).toMatchObject({
			correct: false,
			confusedWith: "bk"
		});
	});
	test("a multiple-choice pick is checked like the same text typed", () => {
		const question: Question = {
			...typed("bk::code2region"),
			questionType: "choice",
			choices: ["Kota Medan", "Kota Padang"]
		};
		expect(check(question, { choice: "Kota Medan" })).toMatchObject({
			correct: true,
			matchType: "exact"
		});
		expect(check(question, { choice: "kota medan" })).toMatchObject({
			correct: true,
			matchType: "exact"
		});
		expect(check(question, { choice: "Kota Padang" })).toMatchObject({
			correct: false,
			confusedWith: "ba"
		});
	});
	test("true or false compares the literal and records the foreign code when the lie is accepted", () => {
		const question: Question = {
			...typed("bk::code2region"),
			questionType: "truefalse",
			answer: { kind: "literal", value: "Salah", confusedWith: "ba" }
		};
		expect(check(question, { choice: "Salah" })).toMatchObject({
			correct: true,
			confusedWith: null
		});
		expect(check(question, { choice: "Benar" })).toMatchObject({
			correct: false,
			confusedWith: "ba"
		});
	});
	test("an empty answer is refused", () => {
		expect(() => check(typed("bk::code2region"), { text: "   " })).toThrow();
	});
	test("an answer is stored at most 120 characters long", () => {
		expect(check(typed("bk::code2region"), { text: "x".repeat(200) }).rawAnswer).toHaveLength(
			120
		);
	});
	test("don't know and time out without input are wrong without a confusion", () => {
		expect(check(typed("bk::code2region", "placement"), { unknown: true })).toMatchObject({
			correct: false,
			matchType: "none",
			rawAnswer: null
		});
	});
	test("an information-only introduction is not graded", () => {
		const question: Question = { ...typed("bk::code2region"), questionType: "intro_read" };
		expect(check(question, { unknown: true })).toMatchObject({
			correct: null,
			matchType: "exact"
		});
	});
});

describe("set answers", () => {
	const question = buildQuestion(
		{ ...newEntry("dk::setrecall"), state: "review", intervalDays: 20 },
		bundle,
		{ context: "setrecall" }
	);
	test("duplicates and an alias of the same area count once", () => {
		expect(check(question, { items: ["Denpasar", "denpasar", "Kota Denpasar"] })).toMatchObject(
			{ setCorrect: 1, setThreshold: 2, correct: false }
		);
	});
	test("an area of another code records the pair", () => {
		const result = check(question, { items: ["Mataram"] });
		expect(result.setItems?.[0][4]).toBe("dr");
	});
	test("stopping with no items is a valid, wrong answer", () => {
		expect(check(question, { items: [] })).toMatchObject({
			setCorrect: 0,
			correct: false,
			rawAnswer: null
		});
	});
	test("a light typo is accepted per item", () => {
		expect(check(question, { items: ["Denpasr", "Badung"] })).toMatchObject({
			setCorrect: 2,
			correct: true
		});
	});
});

describe("special code answers", () => {
	const holder = (id: string) =>
		buildQuestion(
			{ ...newEntry(`${id}::special2holder`), state: "review", intervalDays: 5 },
			bundle,
			{ context: "special" }
		);
	const code = (id: string) =>
		buildQuestion(
			{ ...newEntry(`${id}::holder2special`), state: "review", intervalDays: 5 },
			bundle,
			{ context: "special" }
		);
	test("aliases and a leading embassy word are exact", () => {
		for (const text of ["Japan", "jepang", "Kedubes Jepang"])
			expect(check(holder("cd-49-jepang"), { text })).toMatchObject({
				correct: true,
				matchType: "exact"
			});
	});
	test("another holder is wrong with the confusion and without typo tolerance", () => {
		expect(check(holder("cd-45-iran"), { text: "Irak" })).toMatchObject({
			correct: false,
			confusedWith: "cd-20-irak"
		});
		expect(check(holder("cd-58-undp"), { text: "UNDF" })).toMatchObject({ correct: false });
	});
	test("a light typo in a holder name is accepted", () => {
		expect(check(holder("cd-49-jepang"), { text: "Jepnag" })).toMatchObject({
			correct: true,
			matchType: "typo",
			typoCost: 0.5
		});
	});
	test("the CD prefix is optional, extra digits and other prefixes are wrong", () => {
		for (const text of ["49", "CD 49", "cd49", "049"])
			expect(check(code("cd-49-jepang"), { text }).correct).toBe(true);
		expect(check(code("cd-49-jepang"), { text: "CD 49 07" }).correct).toBe(false);
		expect(check(code("cd-49-jepang"), { text: "CC 49" })).toMatchObject({
			correct: false,
			confusedWith: null
		});
		expect(check(code("cd-49-jepang"), { text: "48" })).toMatchObject({
			correct: false,
			confusedWith: "cd-48-turki"
		});
	});
});
