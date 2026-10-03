import { describe, expect, test } from "bun:test";
import { syncStatus, type SyncFacts } from "../../../src/lib/sync/status";

const NOW = Date.parse("2026-10-04T12:00:00Z");
const DAY = 86_400_000;
const calm: SyncFacts = {
	otherAccount: false,
	outdated: false,
	sessionEnded: false,
	online: true,
	blocks: [],
	lastSyncAt: NOW - 180_000,
	lastPushAt: NOW - 180_000,
	failingSince: null
};

describe("sync status", () => {
	test("nothing waiting reads as synced, with the quarantine count", () => {
		expect(syncStatus(calm, 0, 3, NOW)).toEqual({
			quarantined: 3,
			state: "synced",
			lastSyncAt: NOW - 180_000
		});
	});
	test("waiting changes are counted", () => {
		expect(syncStatus(calm, 12, 0, NOW)).toEqual({
			quarantined: 0,
			state: "pending",
			count: 12
		});
	});
	test("offline wins over waiting changes", () => {
		expect(syncStatus({ ...calm, online: false }, 12, 0, NOW).state).toBe("offline");
	});
	test("three days of failures read as unreachable, counted from the last push", () => {
		const failing = { ...calm, failingSince: NOW - 3 * DAY, lastPushAt: NOW - 4 * DAY };
		expect(syncStatus(failing, 1, 0, NOW)).toEqual({
			quarantined: 0,
			state: "unreachable",
			days: 4
		});
		expect(syncStatus({ ...failing, failingSince: NOW - 2 * DAY }, 1, 0, NOW).state).toBe(
			"pending"
		);
	});
	test("an active block shows its reason; an expired one does not", () => {
		const daily = {
			scope: "review_logs" as const,
			until: NOW + 1000,
			reason: "dailyLimit" as const
		};
		expect(syncStatus({ ...calm, blocks: [daily] }, 5, 0, NOW).state).toBe("dailyLimit");
		expect(
			syncStatus({ ...calm, blocks: [{ ...daily, until: NOW - 1 }] }, 5, 0, NOW).state
		).toBe("pending");
	});
	test("consent outranks other blocks, and account problems outrank everything", () => {
		const blocks = [
			{ scope: "all" as const, until: null, reason: "totalLimit" as const },
			{ scope: "logs" as const, until: null, reason: "consentNeeded" as const }
		];
		expect(syncStatus({ ...calm, blocks }, 0, 0, NOW).state).toBe("consentNeeded");
		expect(syncStatus({ ...calm, blocks, sessionEnded: true }, 0, 0, NOW).state).toBe(
			"sessionEnded"
		);
		expect(
			syncStatus({ ...calm, blocks, sessionEnded: true, outdated: true }, 0, 0, NOW).state
		).toBe("outdated");
		expect(syncStatus({ ...calm, outdated: true, otherAccount: true }, 0, 0, NOW).state).toBe(
			"otherAccount"
		);
	});
});
