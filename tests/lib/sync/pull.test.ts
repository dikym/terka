import { describe, expect, test } from "bun:test";
import { pullStart } from "../../../src/lib/sync/pull";

const MINUTE = 60_000;
const NOW = Date.parse("2026-10-04T12:00:00Z");

describe("choosing where a pull starts", () => {
	test("a first pull starts from zero", () => {
		expect(pullStart([], NOW)).toEqual({ cursor: 0, history: [] });
	});
	test("a pull restarts from the latest pull at least five minutes old", () => {
		const history = [
			{ startedAt: NOW - 20 * MINUTE, cursor: 10 },
			{ startedAt: NOW - 6 * MINUTE, cursor: 40 },
			{ startedAt: NOW - 2 * MINUTE, cursor: 90 }
		];
		expect(pullStart(history, NOW)).toEqual({ cursor: 40, history: history.slice(1) });
	});
	test("with only recent pulls, or a clock moved back, the oldest stored cursor is used", () => {
		const history = [
			{ startedAt: NOW - 2 * MINUTE, cursor: 70 },
			{ startedAt: NOW - MINUTE, cursor: 90 }
		];
		expect(pullStart(history, NOW).cursor).toBe(70);
		expect(pullStart(history, NOW - 60 * MINUTE).cursor).toBe(70);
	});
});
