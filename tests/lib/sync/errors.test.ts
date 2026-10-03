import { describe, expect, test } from "bun:test";
import { backoff, classify, trackRetryAfter } from "../../../src/lib/sync/errors";

const NOW = Date.parse("2026-10-04T15:30:00Z");
const DAY = 86_400_000;

describe("classifying push failures", () => {
	test("network failures and server errors are retried", () => {
		for (const status of [0, 500, 503, 521])
			expect(classify({ status }, "review_logs", NOW)).toEqual({ kind: "retry" });
	});
	test("a 429 waits for Retry-After, or a minute without it", () => {
		expect(classify({ status: 429 }, "review_logs", NOW, 30)).toEqual({
			kind: "wait",
			until: NOW + 30_000
		});
		expect(classify({ status: 429 }, "review_logs", NOW)).toEqual({
			kind: "wait",
			until: NOW + 60_000
		});
	});
	test("an expired session asks for a refresh", () => {
		expect(classify({ status: 401 }, "review_logs", NOW)).toEqual({ kind: "reauth" });
		expect(classify({ status: 403, code: "PGRST303" }, "review_logs", NOW)).toEqual({
			kind: "reauth"
		});
	});
	test("the daily limit blocks that table until the next UTC midnight", () => {
		expect(classify({ status: 400, code: "TK001" }, "sightings", NOW)).toEqual({
			kind: "block",
			scope: "sightings",
			until: Date.parse("2026-10-05T00:00:00Z"),
			reason: "dailyLimit"
		});
	});
	test("account-wide refusals block every push", () => {
		expect(classify({ status: 400, code: "TK002" }, "review_logs", NOW)).toMatchObject({
			scope: "all",
			until: null,
			reason: "totalLimit"
		});
		expect(classify({ status: 400, code: "TK003" }, "devices", NOW)).toMatchObject({
			scope: "all",
			until: NOW + DAY,
			reason: "deviceLimit"
		});
		expect(classify({ status: 400, code: "TK004" }, "devices", NOW)).toMatchObject({
			scope: "all",
			until: NOW + DAY,
			reason: "signupsClosed"
		});
	});
	test("a missing consent blocks log tables until a consent is sent", () => {
		expect(classify({ status: 400, code: "TK005" }, "review_logs", NOW)).toEqual({
			kind: "block",
			scope: "logs",
			until: null,
			reason: "consentNeeded"
		});
	});
	test("a refused close is reconciled against the server row", () => {
		expect(classify({ status: 400, code: "TK006" }, "practice_runs", NOW)).toEqual({
			kind: "reconcile"
		});
	});
	test("other refusals reject the row, naming an unknown time zone", () => {
		expect(
			classify(
				{
					status: 409,
					code: "23503",
					message: 'violates foreign key constraint "review_logs_tz_fkey"'
				},
				"review_logs",
				NOW
			)
		).toEqual({ kind: "reject", reason: "unknown time zone" });
		expect(
			classify({ status: 400, code: "23514", message: "check failed" }, "review_logs", NOW)
		).toEqual({
			kind: "reject",
			reason: "check failed"
		});
	});
});

describe("backoff", () => {
	test("doubles from one second and stops at five minutes", () => {
		expect(backoff(0, () => 0)).toBe(500);
		expect(backoff(0, () => 1)).toBe(1000);
		expect(backoff(3, () => 1)).toBe(8000);
		expect(backoff(20, () => 1)).toBe(300_000);
	});
});

describe("Retry-After", () => {
	test("the tracked fetch remembers the header of the last 429 only", async () => {
		const responses = [
			new Response(null, { status: 429, headers: { "retry-after": "30" } }),
			new Response(null, { status: 200, headers: { "retry-after": "5" } })
		];
		const tracked = trackRetryAfter(async () => responses.shift()!);
		await tracked.fetch("https://x.example");
		expect(tracked.retryAfter()).toBe(30);
		await tracked.fetch("https://x.example");
		expect(tracked.retryAfter()).toBeNull();
	});
});
