import { afterAll, describe, expect, test } from "bun:test";
import type { PracticeRun, ReviewLog } from "../../src/core/log/events";
import { NATIONAL } from "../../src/core/questions/distractors";
import { saveSettings } from "../../src/lib/db/settings";
import { runPush } from "../../src/lib/sync/push";
import { HOUR, MINUTE, review, run, voidOf } from "../../tests/core/replay/fixtures";
import { openDatabase } from "./database";
import { device, fromDevice, noRetryAfter, recorded, signIn, uniqueEmail } from "./harness";

const sql = openDatabase();
afterAll(() => sql.close());
const NOW = Date.now();

const answers = (deviceId: string, count: number) =>
	fromDevice(
		deviceId,
		Array.from({ length: count }, (_, index) =>
			review("dk", "code2region", NOW - 2 * HOUR + index)
		)
	);

describe("pushing the outbox", () => {
	test("rows reach the server once, in foreign-key order, with server metadata kept locally", async () => {
		const phone = await device(await signIn(uniqueEmail("push")));
		const [session] = fromDevice(phone.deviceId, [
			run("daily", NOW - HOUR, {
				endedAt: null,
				answered: null,
				correct: null,
				activeMs: null
			})
		]);
		const [answer] = fromDevice(phone.deviceId, [
			review("dk", "code2region", NOW - HOUR + MINUTE)
		]);
		(answer.row as ReviewLog).runId = session.row.id;
		await recorded(phone.db, [session, answer]);
		const outcome = await runPush(phone.db, phone.client, {
			now: NOW,
			retryAfter: noRetryAfter
		});
		expect(outcome).toEqual({ sent: 4, quarantined: 0, action: null });
		expect(await phone.db.outbox.count()).toBe(0);
		const local = (await phone.db.review_logs.get(answer.row.id))!;
		expect(local.receivedAt).toBeGreaterThan(0);
		expect(local.serverSeq).toBeGreaterThan(0);
		await phone.db.outbox.add({ table: "review_logs", key: answer.row.id, op: "insert" });
		expect(
			(await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter })).sent
		).toBe(1);
		const { data } = await phone.client.from("review_logs").select("id");
		expect(data).toHaveLength(1);
	});

	test("a session finished offline is inserted open, then closed, and a repeated close is accepted", async () => {
		const phone = await device(await signIn(uniqueEmail("offline")));
		const [open] = fromDevice(phone.deviceId, [
			run("kilat", NOW - HOUR, {
				endedAt: null,
				answered: null,
				correct: null,
				activeMs: null,
				score: null
			})
		]);
		const closed = {
			table: "practice_runs",
			row: {
				...(open.row as PracticeRun),
				endedAt: NOW - HOUR + MINUTE,
				answered: 3,
				correct: 2,
				activeMs: MINUTE,
				score: 7
			}
		} as const;
		const log = await recorded(phone.db, [open]);
		await recorded(phone.db, [closed], log);
		expect(
			(await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter })).action
		).toBeNull();
		const { data } = await phone.client
			.from("practice_runs")
			.select("ended_at, score")
			.eq("id", open.row.id)
			.single();
		expect(data!.score).toBe(7);
		await phone.db.outbox.add({ table: "practice_runs", key: open.row.id, op: "close" });
		expect(
			await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter })
		).toEqual({ sent: 1, quarantined: 0, action: null });
	});

	test("a row the server refuses is quarantined with the rows that point at it, the rest is sent", async () => {
		const phone = await device(await signIn(uniqueEmail("reject")));
		const [bad, good] = answers(phone.deviceId, 2);
		const undo = fromDevice(phone.deviceId, [voidOf(bad, NOW - MINUTE)])[0];
		(undo.row as { reviewId: string }).reviewId = bad.row.id;
		await recorded(phone.db, [bad, good, undo]);
		await phone.db.review_logs.update(bad.row.id, { level: 4 as never });
		const outcome = await runPush(phone.db, phone.client, {
			now: NOW,
			retryAfter: noRetryAfter
		});
		expect(outcome.quarantined).toBe(2);
		expect(
			(await phone.db.outbox_quarantine.toArray()).map((entry) => entry.table).sort()
		).toEqual(["review_logs", "review_voids"]);
		const { data } = await phone.client.from("review_logs").select("id");
		expect(data!.map((row) => row.id)).toEqual([good.row.id]);
		expect(await phone.db.outbox.count()).toBe(0);
	});

	test("1,250 answers go out in batches until the daily limit, the rest waits for the next server day", async () => {
		const phone = await device(await signIn(uniqueEmail("daily")));
		await recorded(phone.db, answers(phone.deviceId, 1250));
		const outcome = await runPush(phone.db, phone.client, {
			now: NOW,
			retryAfter: noRetryAfter
		});
		expect(outcome.action).toMatchObject({
			kind: "block",
			scope: "review_logs",
			reason: "dailyLimit"
		});
		const { count } = await phone.client
			.from("review_logs")
			.select("id", { count: "exact", head: true });
		expect(count).toBe(1000);
		expect(
			(await phone.db.outbox.toArray()).filter((item) => item.table === "review_logs").length
		).toBe(250);
		expect(await phone.db.outbox_quarantine.count()).toBe(0);
	});

	test("logs wait for consent, the device and the consent itself still go out", async () => {
		const phone = await device(await signIn(uniqueEmail("consent")), { consent: false });
		await recorded(phone.db, answers(phone.deviceId, 1));
		const outcome = await runPush(phone.db, phone.client, {
			now: NOW,
			retryAfter: noRetryAfter
		});
		expect(outcome.action).toMatchObject({
			kind: "block",
			scope: "logs",
			reason: "consentNeeded"
		});
		expect(
			(await phone.db.outbox.toArray()).filter((item) => item.table === "review_logs").length
		).toBe(1);
		await phone.db.privacy_consents.put({
			policyVersion: "2026-10-01",
			deviceId: phone.deviceId,
			consentedAt: NOW,
			receivedAt: null
		});
		await phone.db.outbox.add({ table: "privacy_consents", key: "2026-10-01", op: "insert" });
		expect(
			(await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter })).action
		).toBeNull();
		expect(await phone.db.outbox.count()).toBe(0);
	});

	test("closed signups stop every push of a new account", async () => {
		await sql`update public.service_flags set signups_open = false`;
		try {
			const phone = await device(await signIn(uniqueEmail("closed")));
			const outcome = await runPush(phone.db, phone.client, {
				now: NOW,
				retryAfter: noRetryAfter
			});
			expect(outcome.action).toMatchObject({
				kind: "block",
				scope: "all",
				reason: "signupsClosed"
			});
			expect(await phone.db.outbox.count()).toBe(2);
		} finally {
			await sql`update public.service_flags set signups_open = true`;
		}
	});

	test("an undo of an answer held by the daily limit waits instead of being quarantined", async () => {
		const phone = await device(await signIn(uniqueEmail("held")));
		const batch = answers(phone.deviceId, 1001);
		const undo = fromDevice(phone.deviceId, [voidOf(batch[1000], NOW - MINUTE)])[0];
		(undo.row as { reviewId: string }).reviewId = batch[1000].row.id;
		await recorded(phone.db, [...batch, undo]);
		const outcome = await runPush(phone.db, phone.client, {
			now: NOW,
			retryAfter: noRetryAfter
		});
		expect(outcome.quarantined).toBe(0);
		expect(await phone.db.outbox_quarantine.count()).toBe(0);
		expect((await phone.db.outbox.toArray()).map((item) => item.table).sort()).toEqual([
			"review_logs",
			"review_voids"
		]);
	});

	test("a quarantined session takes its close along", async () => {
		const phone = await device(await signIn(uniqueEmail("close-along")));
		const [open] = fromDevice(phone.deviceId, [
			run("daily", NOW - HOUR, {
				endedAt: null,
				answered: null,
				correct: null,
				activeMs: null
			})
		]);
		const log = await recorded(phone.db, [open]);
		await recorded(
			phone.db,
			[
				{
					table: "practice_runs",
					row: {
						...(open.row as PracticeRun),
						endedAt: NOW - HOUR + MINUTE,
						answered: 1,
						correct: 1,
						activeMs: MINUTE
					}
				}
			],
			log
		);
		await phone.db.practice_runs.update(open.row.id, { scopeId: "NOT A REF" });
		await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter });
		expect(await phone.db.outbox.count()).toBe(0);
		expect((await phone.db.outbox_quarantine.toArray()).map((entry) => entry.table)).toEqual([
			"practice_runs",
			"practice_runs"
		]);
	});

	test("repeated saves leave no item behind once sent", async () => {
		const phone = await device(await signIn(uniqueEmail("repeat")));
		await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter });
		for (const special of [true, false, true])
			await saveSettings(
				phone.db,
				{ scope: NATIONAL, specialEnabled: special },
				{ now: NOW, deviceId: phone.deviceId }
			);
		await runPush(phone.db, phone.client, { now: NOW, retryAfter: noRetryAfter });
		expect(await phone.db.outbox.count()).toBe(0);
	});
});
