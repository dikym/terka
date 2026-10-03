import { describe, expect, test } from "bun:test";
import type { LearningEvent, ReviewLog } from "../../../src/core/log/events";
import type { TableName } from "../../../src/lib/db/schema";
import { fromWire, TABLES, toWire } from "../../../src/lib/db/wire";
import {
	cardEvent,
	factView,
	NOW,
	params,
	review,
	run,
	sighting,
	voidOf
} from "../../core/replay/fixtures";
import { asUuid, withUuids } from "./fixtures";

const answer = review("bk", "setrecall", NOW, {
	receivedAt: NOW + 1000,
	serverSeq: 7,
	questionType: "setrecall",
	setCorrect: 1,
	setThreshold: 2,
	setItems: [["medan", "kota-medan", "exact", 0, null]]
});
const events = withUuids([
	run("daily", NOW),
	answer,
	voidOf(answer, NOW + 1),
	cardEvent("bk", "code2region", "suspend", NOW),
	sighting("bk", NOW),
	factView("f-001", NOW),
	params(NOW, [0.4, 1.2], { trainingEventIds: [asUuid("a")] })
]);
const device = asUuid("device-a");
const others: [TableName, object][] = [
	[
		"devices",
		{ id: device, label: "iPhone", platform: "Safari", createdAt: NOW, lastSeenAt: null }
	],
	["privacy_consents", { policyVersion: "2026-10", consentedAt: NOW, receivedAt: NOW + 5 }],
	[
		"user_settings",
		{
			activeScopeLevel: "group",
			activeScopeId: "sumatera",
			specialEnabled: true,
			updatedAt: NOW,
			updatedByDevice: device,
			receivedAt: null
		}
	],
	[
		"card_notes",
		{
			contentId: "dk",
			body: "Denpasar",
			updatedAt: NOW,
			updatedByDevice: device,
			receivedAt: null
		}
	]
];
const rows: [TableName, object][] = [
	...events.map((event: LearningEvent): [TableName, object] => [event.table, event.row]),
	...others
];

describe("wire format", () => {
	test("every table has a schema", () => {
		expect([...TABLES].sort()).toEqual(
			(
				[
					"card_events",
					"card_notes",
					"devices",
					"fact_views",
					"fsrs_params",
					"practice_runs",
					"privacy_consents",
					"review_logs",
					"review_voids",
					"sightings",
					"user_settings"
				] as TableName[]
			).sort()
		);
	});
	test("columns are snake_case and times are ISO strings", () => {
		const wire = toWire(answer.row);
		expect(wire.client_ts).toBe(new Date(NOW).toISOString());
		expect(wire.received_at).toBe(new Date(NOW + 1000).toISOString());
		expect(wire.server_seq).toBe(7);
		expect(wire.set_items).toEqual([["medan", "kota-medan", "exact", 0, null]]);
		expect(wire.ms_to_first_key).toBe(2000);
		expect(wire.local_day).toBe((answer.row as ReviewLog).localDay);
		expect(Object.keys(wire).every((key) => /^[a-z_]+$/.test(key))).toBe(true);
	});
	test("every table survives a round trip unchanged", () => {
		for (const [table, row] of rows) {
			const result = fromWire(table, JSON.parse(JSON.stringify(toWire(row))));
			const parsed: unknown = result.success ? result.data : result.error.issues;
			expect(parsed).toEqual(row);
		}
	});
	test("unknown columns, bad ids and bad times are rejected", () => {
		const wire = toWire(events[1].row);
		expect(fromWire("review_logs", { ...wire, user_id: "x" }).success).toBe(false);
		expect(fromWire("review_logs", { ...wire, id: "id-000001" }).success).toBe(false);
		expect(fromWire("review_logs", { ...wire, client_ts: "kemarin" }).success).toBe(false);
		expect(fromWire("review_logs", { ...wire, mode: "drill" }).success).toBe(false);
	});
	test("a note longer than 280 code points is rejected", () => {
		const note = toWire(others[3][1]);
		expect(fromWire("card_notes", { ...note, body: "a".repeat(281) }).success).toBe(false);
		expect(fromWire("card_notes", { ...note, body: "🚗".repeat(280) }).success).toBe(true);
	});
});
