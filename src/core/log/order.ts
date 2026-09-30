import type { LearningEvent } from "./events";

export type EventKey = { ts: number; deviceId: string; id: string };

function baseTs(event: LearningEvent): number {
	switch (event.table) {
		case "practice_runs":
			return event.row.startedAt;
		case "fsrs_params":
			return event.row.createdAt;
		default:
			return event.row.clientTs;
	}
}

// A device clock running ahead cannot push its events past rows the server received later.
export function effectiveTs(event: LearningEvent): number {
	const base = baseTs(event);
	const received = event.row.receivedAt;
	return received !== null && base > received ? received : base;
}

export const eventKey = (event: LearningEvent): EventKey => ({
	ts: effectiveTs(event),
	deviceId: event.row.deviceId,
	id: event.row.id
});

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export const compareKeys = (a: EventKey, b: EventKey) =>
	a.ts - b.ts || compareText(a.deviceId, b.deviceId) || compareText(a.id, b.id);

// A closed session beats its open copy; a copy the server has seen beats one it has not.
const weight = (event: LearningEvent) =>
	(event.table === "practice_runs" && event.row.endedAt !== null ? 2 : 0) +
	(event.row.receivedAt !== null ? 1 : 0);

export function dedupeEvents(events: readonly LearningEvent[]): LearningEvent[] {
	const kept = new Map<string, LearningEvent>();
	for (const event of events) {
		const id = `${event.table}:${event.row.id}`;
		const previous = kept.get(id);
		if (!previous || weight(event) > weight(previous)) kept.set(id, event);
	}
	return [...kept.values()];
}

export function sortEvents(events: readonly LearningEvent[]): LearningEvent[] {
	return dedupeEvents(events)
		.map((event) => ({ event, key: eventKey(event) }))
		.sort((a, b) => compareKeys(a.key, b.key))
		.map(({ event }) => event);
}
