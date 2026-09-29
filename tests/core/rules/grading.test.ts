import { describe, expect, test } from "bun:test";
import { percentile } from "../../../src/core/grading/fluency";
import { gradeAnswer, gradePlacement, gradeSet } from "../../../src/core/grading/grade";
import type { AnswerSignals } from "../../../src/core/grading/signals";

const answer = (overrides: Partial<AnswerSignals> = {}): AnswerSignals => ({
	context: "daily",
	level: 2,
	levelSource: "auto",
	questionType: "typed",
	answerForm: "name",
	inputMode: "keyboard",
	correct: true,
	timedOut: false,
	interrupted: false,
	matchType: "exact",
	typoCost: 0,
	msToFirstKey: 2015,
	msTotal: 3000,
	msTyping: 500,
	keyGapsMs: [100, 100],
	deletedChars: 0,
	optionChanges: 0,
	answerLength: 5,
	assisted: false,
	setCorrect: null,
	setThreshold: null,
	...overrides
});
// 30 clean samples: latency 2000–2029 ms, typing 100–106 ms/char, longest gap 200–229 ms.
const history = (count = 30, overrides: Partial<AnswerSignals> = {}) =>
	Array.from({ length: count }, (_, index) =>
		answer({
			msToFirstKey: 2000 + index,
			msTyping: 500 + index,
			keyGapsMs: [200 + index],
			...overrides
		})
	);
const samples = history();

describe("grading (SRD 4.4)", () => {
	test("SR-029/SR-030: wrong or timed out is 1", () => {
		expect(gradeAnswer(answer({ correct: false }), samples)).toBe(1);
		expect(gradeAnswer(answer({ timedOut: true }), samples)).toBe(1);
	});
	test("SR-032/SR-034/SR-035: latency below P20 is 4, between is 3, above P80 is 2", () => {
		expect(gradeAnswer(answer({ msToFirstKey: 100 }), samples)).toBe(4);
		expect(gradeAnswer(answer(), samples)).toBe(3);
		expect(gradeAnswer(answer({ msToFirstKey: 5000 }), samples)).toBe(2);
	});
	test("SR-036: latency exactly at P20 and P80 scores 0", () => {
		const latencies = samples.map((item) => item.msToFirstKey!);
		expect(gradeAnswer(answer({ msToFirstKey: percentile(latencies, 0.2) }), samples)).toBe(3);
		expect(gradeAnswer(answer({ msToFirstKey: percentile(latencies, 0.8) }), samples)).toBe(3);
	});
	test("SR-033: a fast typo loses one point and stays Good", () => {
		expect(
			gradeAnswer(answer({ msToFirstKey: 100, matchType: "typo", typoCost: 0.5 }), samples)
		).toBe(3);
	});
	test("SR-037: slow typing per character costs one point", () => {
		expect(gradeAnswer(answer({ msTyping: 5000 }), samples)).toBe(2);
	});
	test("SR-038/SR-039: the longest gap costs a point only above P90 and 1.200 ms", () => {
		expect(gradeAnswer(answer({ keyGapsMs: [1500] }), samples)).toBe(2);
		expect(gradeAnswer(answer({ keyGapsMs: [900] }), samples)).toBe(3);
	});
	test("SR-040: deleting 30% or more of the final answer costs a point", () => {
		expect(gradeAnswer(answer({ answerLength: 8, deletedChars: 3 }), samples)).toBe(2);
		expect(gradeAnswer(answer({ answerLength: 8, deletedChars: 2 }), samples)).toBe(3);
	});
	test("SR-041: changing a Level 1 choice costs a point", () => {
		expect(gradeAnswer(answer({ optionChanges: 1 }), samples)).toBe(2);
	});
	test("SR-042/SR-043: the wide group backs up a small group; below 30 everywhere scores 0", () => {
		const mixed = [...history(29), answer({ answerForm: "code", msToFirstKey: 2029 })];
		expect(gradeAnswer(answer({ msToFirstKey: 100 }), mixed)).toBe(4);
		expect(gradeAnswer(answer({ msToFirstKey: 100 }), history(29))).toBe(3);
	});
	test("SR-044/SR-045: interruptions give 3 and never become samples", () => {
		expect(gradeAnswer(answer({ interrupted: true, msToFirstKey: 100 }), samples)).toBe(3);
		expect(gradeAnswer(answer({ msToFirstKey: 75_000 }), samples)).toBe(3);
		expect(gradeAnswer(answer({ msToFirstKey: 100 }), history(30, { interrupted: true }))).toBe(
			3
		);
	});
	test("SR-191: touch answers are compared with touch answers", () => {
		const touch = history(30, { inputMode: "touch", msToFirstKey: 2500 });
		const keyboard = history(30, { msToFirstKey: 1000 });
		expect(
			gradeAnswer(answer({ inputMode: "touch", msToFirstKey: 2500 }), [...keyboard, ...touch])
		).toBe(3);
	});
	test("SR-195/SR-200: lower manual levels, intros and placement answers are not samples", () => {
		for (const excluded of [
			{ levelSource: "manual_down" as const },
			{ context: "intro" as const },
			{ context: "placement" as const }
		])
			expect(gradeAnswer(answer({ msToFirstKey: 100 }), history(30, excluded))).toBe(3);
	});
	test("Perkenalan and unverified answers are not graded", () => {
		expect(gradeAnswer(answer({ context: "intro" }), samples)).toBeNull();
		expect(gradeAnswer(answer({ questionType: "intro_read" }), samples)).toBeNull();
		expect(gradeAnswer(answer({ matchType: "unverified", correct: null }), samples)).toBeNull();
	});
	test("Review Focus: a correct answer without a first input grades without the latency component", () => {
		expect(gradeAnswer(answer({ msToFirstKey: null }), samples)).toBe(3);
	});
	test("SR-197: a fast clean exact answer with a spacing variant grades 4", () => {
		// "Bukit Tinggi" matches Kota Bukittinggi as exact (see match-name.test.ts); spaces cost nothing.
		expect(
			gradeAnswer(
				answer({ msToFirstKey: 100, matchType: "exact", answerLength: 12 }),
				samples
			)
		).toBe(4);
	});
	test("SR-099/SR-104: set grading maps counts against the threshold", () => {
		expect([0, 4, 5, 6, 7].map((count) => gradeSet(count, 5))).toEqual([1, 2, 3, 3, 4]);
	});
	test("a set recall answer grades by its counts, ignoring correct and interrupted", () => {
		const setrecall = { questionType: "setrecall" as const, setThreshold: 5 };
		expect(
			gradeAnswer(
				answer({ ...setrecall, setCorrect: 4, correct: false, interrupted: true }),
				samples
			)
		).toBe(2);
		expect(() => gradeAnswer(answer({ ...setrecall, setCorrect: null }), samples)).toThrow();
	});
	test("SR-234/SR-235/SR-236/SR-237: placement grading", () => {
		const placement = (overrides: Partial<AnswerSignals>) =>
			answer({ context: "placement", ...overrides });
		expect(gradePlacement(placement({ msToFirstKey: 2400 }))).toBe(4);
		expect(gradePlacement(placement({ msToFirstKey: 4000 }))).toBe(3);
		expect(gradePlacement(placement({ msToFirstKey: 2000, matchType: "typo" }))).toBe(3);
		expect(gradePlacement(placement({ correct: false }))).toBeNull();
		expect(gradePlacement(placement({ interrupted: true }))).toBeNull();
	});
});
