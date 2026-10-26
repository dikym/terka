import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import plates from "../../../src/data/plates.json";
import { demoQuestions } from "../../../src/lib/view/demo";
import { DEMO_LENGTH, demoRound } from "../../../src/lib/view/demo-round";

const bundle = plates as unknown as Bundle;
const questions = demoQuestions(bundle);

describe("landing demo questions", () => {
	test("come from the codes most often seen on the road", () => {
		const common = new Set(
			bundle.regions.filter((region) => region.placementTier === "common").map((r) => r.code)
		);
		expect(questions.length).toBeGreaterThanOrEqual(DEMO_LENGTH);
		expect(questions.every((question) => common.has(question.code))).toBe(true);
	});
	test("offer four different provinces, the right one first", () => {
		for (const question of questions) {
			expect(question.choices).toHaveLength(4);
			expect(new Set(question.choices).size).toBe(4);
			expect(question.choices[0]).toBe(question.answer);
		}
	});
	test("name the areas that use the code", () => {
		const dk = questions.find((question) => question.code === "DK")!;
		expect(dk.answer).toBe("Bali");
		expect(dk.areas).toContain("Kota Denpasar");
	});
	test("stay small enough to ship with the page", () => {
		expect(JSON.stringify(questions).length).toBeLessThan(3_000);
	});
});

describe("a demo round", () => {
	test("asks three codes from three different provinces", () => {
		for (const seed of [0, 0.13, 0.5, 0.77, 0.99]) {
			const round = demoRound(questions, seed);
			expect(round).toHaveLength(DEMO_LENGTH);
			expect(new Set(round.map((question) => question.answer)).size).toBe(DEMO_LENGTH);
		}
	});
	test("changes with the seed, choices included", () => {
		const a = demoRound(questions, 0.1);
		const b = demoRound(questions, 0.6);
		expect(a.map((q) => q.code)).not.toEqual(b.map((q) => q.code));
		expect(demoRound(questions, 0.1)).toEqual(a);
		expect(a.some((question) => question.choices[0] !== question.answer)).toBe(true);
	});
});
