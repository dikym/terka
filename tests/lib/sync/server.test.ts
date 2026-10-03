import { describe, expect, test } from "bun:test";
import type { PracticeRun } from "../../../src/core/log/events";
import { closingOf, fromServer, toServer } from "../../../src/lib/sync/server";
import { NOW, params, review, run } from "../../core/replay/fixtures";

describe("server rows", () => {
	test("server-filled and local-only columns never leave the device", () => {
		const answer = toServer("review_logs", {
			...review("dk", "code2region", NOW).row,
			receivedAt: NOW,
			serverSeq: 4
		});
		expect(answer).not.toHaveProperty("received_at");
		expect(answer).not.toHaveProperty("server_seq");
		expect(answer.client_ts).toBe(new Date(NOW).toISOString());
		const fitted = toServer("fsrs_params", {
			...params(NOW, []).row,
			trainingEventIds: ["a"],
			trainingSetHash: "ab"
		});
		expect(fitted).not.toHaveProperty("training_event_ids");
		expect(fitted.training_set_hash).toBe("\\xab");
		const device = toServer("devices", {
			id: "d",
			label: "x",
			platform: "y",
			createdAt: NOW,
			lastSeenAt: NOW
		});
		expect(device).not.toHaveProperty("last_seen_at");
	});
	test("a session is inserted without closing columns and closed with them alone", () => {
		const closed = run("kilat", NOW).row as PracticeRun;
		const inserted = toServer("practice_runs", closed);
		for (const column of [
			"ended_at",
			"answered",
			"correct",
			"active_ms",
			"score",
			"placement_level"
		])
			expect(inserted).not.toHaveProperty(column);
		expect(inserted.started_at).toBe(new Date(NOW).toISOString());
		expect(closingOf(closed)).toEqual({
			ended_at: new Date(closed.endedAt!).toISOString(),
			answered: closed.answered,
			correct: closed.correct,
			active_ms: closed.activeMs,
			score: closed.score,
			placement_level: null
		});
	});
	test("server rows come back in local shape without the owner and with hex hashes", () => {
		expect(
			fromServer("fsrs_params", {
				user_id: "u",
				id: "p",
				training_set_hash: "\\xab",
				created_at: new Date(NOW).toISOString(),
				received_at: new Date(NOW + 5).toISOString(),
				server_seq: 9
			})
		).toEqual({
			id: "p",
			trainingSetHash: "ab",
			createdAt: NOW,
			receivedAt: NOW + 5,
			serverSeq: 9
		});
	});
});
