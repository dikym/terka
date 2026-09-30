import { describe, expect, test } from "bun:test";
import { streak } from "../../../src/core/replay/streak";
import { addDays } from "../../../src/core/time/day";

const days = (start: string, count: number, skip: number[] = []) =>
	new Set(
		Array.from({ length: count }, (_, index) => index)
			.filter((index) => !skip.includes(index))
			.map((index) => addDays(start, index))
	);

describe("Hari Beruntun", () => {
	test("consecutive challenge days count one each", () => {
		expect(streak(days("2026-09-01", 10), "2026-09-10")).toBe(10);
	});
	test("today not done yet does not break the streak", () => {
		expect(streak(days("2026-09-01", 9), "2026-09-10")).toBe(9);
	});
	test("one missed day inside 30 days is forgiven", () => {
		expect(streak(days("2026-09-01", 10, [4]), "2026-09-10")).toBe(9);
	});
	test("a second missed day inside the same 30 days resets to zero", () => {
		expect(streak(days("2026-09-01", 10, [2, 7]), "2026-09-10")).toBe(2);
	});
	test("missed days on both sides of a month change share one window", () => {
		const set = new Set([...days("2026-08-20", 11), ...days("2026-09-02", 3)]);
		expect(streak(set, "2026-09-04")).toBe(3);
	});
	test("a missed day forgiven more than 30 days ago frees the tolerance again", () => {
		expect(streak(days("2026-08-01", 40, [2, 35]), "2026-09-09")).toBe(38);
	});
	test("no challenge days is zero", () => {
		expect(streak(new Set(), "2026-09-10")).toBe(0);
	});
});
