import type { LearningEvent } from "../../../src/core/log/events";
import { seeded } from "../../../src/core/random";
import { uuidV7 } from "../../../src/core/session/ids";
import { TerkaDb } from "../../../src/lib/db/schema";
import { HOUR, NOW, review, stateOf } from "../../core/replay/fixtures";

// Every test gets its own database; bun shares one fake IndexedDB across test files.
export const freshDb = () => new TerkaDb(`test-${crypto.randomUUID()}`);

// The same text always gives the same UUID v7, so fixture ids stay readable in tests.
export const asUuid = (value: string) => uuidV7(0, seeded(value));
const ref = (value: string | null) => (value === null ? null : asUuid(value));

// Core fixtures use short ids; the export format only accepts UUID v7 ids.
export const withUuids = (events: LearningEvent[]): LearningEvent[] =>
	events.map((event) => {
		const ids = { id: asUuid(event.row.id), deviceId: asUuid(event.row.deviceId) };
		switch (event.table) {
			case "review_logs":
				return {
					table: event.table,
					row: { ...event.row, ...ids, runId: ref(event.row.runId) }
				};
			case "review_voids":
				return {
					table: event.table,
					row: { ...event.row, ...ids, reviewId: asUuid(event.row.reviewId) }
				};
			case "fact_views":
				return {
					table: event.table,
					row: { ...event.row, ...ids, runId: ref(event.row.runId) }
				};
			default:
				return { ...event, row: { ...event.row, ...ids } } as LearningEvent;
		}
	});

// Correct special2holder answers at each due time until holder2special opens (four answers).
export function unlockingSpecial(contentId = "cd-49-jepang"): LearningEvent[] {
	const events = [
		review(contentId, "special2holder", NOW, {
			context: "intro",
			level: 1,
			questionType: "choice"
		})
	];
	let at = NOW;
	while (stateOf(events).cards.get(`${contentId}::holder2special`)!.state === "locked") {
		if (events.length > 10) throw new Error("holder2special never opened");
		at =
			Math.max(stateOf(events).cards.get(`${contentId}::special2holder`)!.due, at + HOUR) +
			HOUR;
		events.push(review(contentId, "special2holder", at, { context: "special" }));
	}
	return events;
}
