import { describe, expect, test } from "bun:test";
import type { CountedAnswer } from "../../../src/core/optimizer/counted";
import { revlogCsv } from "../../../src/core/optimizer/steps";

const answer = (
	cardId: string,
	at: number,
	overrides: Partial<CountedAnswer> = {}
): CountedAnswer => ({
	id: `${cardId}-${at}`,
	cardId,
	at,
	localDay: "2026-09-21",
	grade: 3,
	settled: false,
	correct: true,
	serverSeq: null,
	msTotal: 4000,
	...overrides
});

const rows = (counted: CountedAnswer[]) => new TextDecoder().decode(revlogCsv(counted)).split("\n");

describe("revlogCsv", () => {
	test("writes the revlog columns the optimizer reads", () => {
		expect(rows([])[0]).toBe("card_id,review_time,review_rating,review_state,review_duration");
	});

	test("marks first answers, learning steps, reviews and relearning", () => {
		const csv = rows([
			answer("dk::code2region", 1_000),
			answer("dk::code2region", 2_000),
			answer("dk::code2region", 3_000, { settled: true, grade: 1, correct: false }),
			answer("dk::code2region", 4_000, { msTotal: 2500 }),
			answer("dk::code2region", 5_000, { settled: true, grade: 4 })
		]);
		expect(csv.slice(1)).toEqual([
			"0,1000,3,0,4000",
			"0,2000,3,1,4000",
			"0,3000,1,2,4000",
			"0,4000,3,3,2500",
			"0,5000,4,2,4000"
		]);
	});

	test("numbers cards by first appearance and orders rows by time", () => {
		const csv = rows([answer("bk::code2region", 2_000), answer("dk::code2region", 1_000)]);
		expect(csv.slice(1).map((row) => row.split(",").slice(0, 2).join(","))).toEqual([
			"0,1000",
			"1,2000"
		]);
	});
});
