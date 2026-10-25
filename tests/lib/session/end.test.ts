import { describe, expect, test } from "bun:test";
import type { ReviewLog } from "../../../src/core/log/events";
import { endView } from "../../../src/lib/session/end";
import { createMeasure } from "../../../src/lib/session/measure";
import { NOW, review, ruleBundle, stateOf } from "../../core/replay/fixtures";

const bundle = ruleBundle();
const answer = (correct: boolean | null, msToFirstKey: number) =>
	review("bk", "code2region", NOW, { correct, msToFirstKey }).row as ReviewLog;

describe("session end", () => {
	test("accuracy leaves out unverified answers and latency reads in seconds", () => {
		const state = stateOf([]);
		const view = endView({
			mode: "hariIni",
			before: state,
			after: state,
			answers: [answer(true, 2000), answer(false, 2200), answer(null, 1900)],
			bundle,
			held: false,
			fact: null,
			kilat: null,
			loginPrompt: false,
			today: "2026-09-21"
		});
		expect(view.accuracy).toBe(50);
		expect(view.latency).toBe("2,0");
		expect(view.answered).toBe(3);
		expect(view.mastery).toBeNull();
		expect(view.pair).toBeNull();
	});

	test("a kilat record names its region", () => {
		const state = stateOf([]);
		const view = endView({
			mode: "kilat",
			before: state,
			after: state,
			answers: [answer(true, 900)],
			bundle,
			held: false,
			fact: null,
			kilat: { score: 1, record: null, scope: { level: "group", id: "jawa" } },
			loginPrompt: false,
			today: "2026-09-21"
		});
		expect(view.kilatLine).toBe("Rekor baru di Kawasan Jawa: 1");
	});
});

// Hands out the given times in order, one per clock read.
const clockOf = (times: number[]) => () => times.shift()!;

describe("answer measurements", () => {
	test("typing times and deleted characters are measured from the question", () => {
		const measure = createMeasure(clockOf([1000, 1500, 1700, 1800, 2000, 2500]));
		measure.input("M");
		measure.input("Me");
		measure.input("M");
		measure.input("Me");
		const result = measure.finish({ timedOut: false, optionCount: null });
		expect(result).toMatchObject({
			msToFirstKey: 500,
			msTotal: 1500,
			msTyping: 500,
			keyGapsMs: [200, 100, 200],
			deletedChars: 1,
			inputMode: "keyboard",
			interrupted: false
		});
	});

	test("a choice counts its changes and touch input is remembered", () => {
		const measure = createMeasure(clockOf([0, 800, 800]));
		measure.pointer("touch");
		measure.choose();
		const result = measure.finish({ timedOut: false, optionCount: 4 });
		expect(result).toMatchObject({
			msToFirstKey: 800,
			msTyping: null,
			keyGapsMs: null,
			optionCount: 4,
			inputMode: "touch"
		});
	});
});

describe("recheck end", () => {
	test("the recheck end shows correct and predicted percent per group", () => {
		const state = stateOf([]);
		const recheck = (code: string, correct: boolean) =>
			review(code, "code2region", NOW, { correct, context: "recheck" }).row as ReviewLog;
		const view = endView({
			mode: "cek",
			before: state,
			after: state,
			answers: [recheck("bk", true), recheck("ba", false), recheck("dk", true)],
			bundle,
			held: false,
			fact: null,
			kilat: null,
			loginPrompt: false,
			today: "2026-09-21",
			predicted: new Map([
				["sumatera", 0.8],
				["bali-nusa-tenggara", 0.555]
			])
		});
		expect(view.recheck).toEqual([
			{ name: "Sumatera", group: "sumatera", correct: 50, predicted: 80 },
			{ name: "Bali & Nusa Tenggara", group: "balinusra", correct: 100, predicted: 56 }
		]);
	});
	test("other sessions have no recheck section", () => {
		const state = stateOf([]);
		const view = endView({
			mode: "hariIni",
			before: state,
			after: state,
			answers: [answer(true, 900)],
			bundle,
			held: false,
			fact: null,
			kilat: null,
			loginPrompt: false,
			today: "2026-09-21"
		});
		expect(view.recheck).toBeNull();
	});
});

describe("recheck end at the edges", () => {
	const state = stateOf([]);
	const recheck = (code: string, correct: boolean) =>
		review(code, "code2region", NOW, { correct, context: "recheck" }).row as ReviewLog;
	const end = (answers: ReviewLog[], predicted: Map<string, number>) =>
		endView({
			mode: "cek",
			before: state,
			after: state,
			answers,
			bundle,
			held: false,
			fact: null,
			kilat: null,
			loginPrompt: false,
			today: "2026-09-21",
			predicted
		});

	test("a group whose answers were all taken back is left out", () => {
		const view = end(
			[recheck("bk", true)],
			new Map([
				["sumatera", 0.8],
				["jawa", 0.6]
			])
		);
		expect(view.recheck?.map((row) => row.group)).toEqual(["sumatera"]);
	});
	test("a re-asked code counts only its first answer", () => {
		const view = end([recheck("bk", false), recheck("bk", true)], new Map([["sumatera", 0.5]]));
		expect(view.recheck?.[0].correct).toBe(0);
	});
	test("an unverified answer counts as not recalled", () => {
		const unverified = review("bk", "code2region", NOW, { correct: null, context: "recheck" })
			.row as ReviewLog;
		expect(end([unverified], new Map([["sumatera", 0.5]])).recheck?.[0].correct).toBe(0);
	});
});
