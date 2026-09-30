import { describe, expect, test } from "bun:test";
import type { LearningEvent } from "../../../src/core/log/events";
import {
	compareKeys,
	dedupeEvents,
	effectiveTs,
	eventKey,
	sortEvents
} from "../../../src/core/log/order";
import { HOUR, MINUTE, NOW, review, run } from "./fixtures";

const ids = (events: LearningEvent[]) => events.map((event) => event.row.id);

describe("event order", () => {
	test("events with the same time and device sort by id", () => {
		const a = review("dk", "code2region", NOW, { id: "b" });
		const b = review("dk", "code2region", NOW, { id: "a" });
		expect(ids(sortEvents([a, b]))).toEqual(["a", "b"]);
	});
	test("device id breaks ties before the event id", () => {
		const a = review("dk", "code2region", NOW, { id: "a", deviceId: "device-b" });
		const b = review("dk", "code2region", NOW, { id: "b", deviceId: "device-a" });
		expect(ids(sortEvents([a, b]))).toEqual(["b", "a"]);
	});
	test("a client clock ahead of the server uses the received time", () => {
		const ahead = review("dk", "code2region", NOW + 2 * HOUR, { receivedAt: NOW });
		expect(effectiveTs(ahead)).toBe(NOW);
		const behind = review("dk", "code2region", NOW, { receivedAt: NOW + HOUR });
		expect(effectiveTs(behind)).toBe(NOW);
	});
	test("sessions sort by start time", () => {
		const session = run("daily", NOW + MINUTE);
		expect(eventKey(session).ts).toBe(NOW + MINUTE);
		expect(
			compareKeys(eventKey(session), eventKey(review("dk", "code2region", NOW)))
		).toBeGreaterThan(0);
	});
	test("a closed session copy wins over its open copy", () => {
		const open = run("kilat", NOW, { id: "r", endedAt: null, score: null });
		const closed = run("kilat", NOW, { id: "r", score: 12 });
		for (const order of [
			[open, closed],
			[closed, open]
		]) {
			const [kept] = dedupeEvents(order);
			expect(kept.row).toMatchObject({ id: "r", score: 12 });
		}
	});
	test("a copy the server has seen wins over the local one", () => {
		const local = review("dk", "code2region", NOW, { id: "x" });
		const remote = review("dk", "code2region", NOW, { id: "x", receivedAt: NOW, serverSeq: 7 });
		expect(dedupeEvents([local, remote])[0].row.receivedAt).toBe(NOW);
		expect(dedupeEvents([remote, local])[0].row.receivedAt).toBe(NOW);
	});
	test("the same id in different tables are different events", () => {
		const answer = review("dk", "code2region", NOW, { id: "same" });
		const session = run("daily", NOW, { id: "same" });
		expect(sortEvents([answer, session])).toHaveLength(2);
	});
});
