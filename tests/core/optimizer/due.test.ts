import { describe, expect, test } from "bun:test";
import { optimizationDue } from "../../../src/core/optimizer/due";
import { answers, DAY, NOW, paramsRow } from "./fixtures";

const later = NOW + 1_000 * 3_600_000;

describe("optimizationDue", () => {
	test("waits while introductions keep the counted answers under 1,000", () => {
		expect(optimizationDue(answers(960, 300), [], later)).toBe(false);
	});

	test("waits for 200 distinct cards", () => {
		expect(optimizationDue(answers(1_000, 150), [], later)).toBe(false);
	});

	test("runs the first time at 1,000 answers over 200 cards", () => {
		expect(optimizationDue(answers(1_000, 200), [], later)).toBe(true);
	});

	test("waits at 999 answers", () => {
		expect(optimizationDue(answers(999, 300), [], later)).toBe(false);
	});

	describe("after an earlier optimization", () => {
		const last = paramsRow({ createdAt: NOW, activatedAt: NOW });
		const fresh = answers(500, 100, { from: NOW + 1 });

		test("waits for 30 days even with 500 new answers", () => {
			expect(optimizationDue(fresh, [last], NOW + 20 * DAY)).toBe(false);
		});

		test("runs once both 500 answers and 30 days are reached", () => {
			expect(optimizationDue(fresh, [last], NOW + 30 * DAY)).toBe(true);
		});

		test("waits for 500 answers even after 30 days", () => {
			expect(optimizationDue(fresh.slice(1), [last], NOW + 31 * DAY)).toBe(false);
		});

		test("counts a rejected run from another device as the last run", () => {
			const elsewhere = paramsRow({
				id: "row-2",
				deviceId: "device-b",
				status: "rejected",
				activatedAt: null,
				createdAt: NOW + 25 * DAY
			});
			expect(optimizationDue(fresh, [last, elsewhere], NOW + 30 * DAY)).toBe(false);
		});
	});
});
