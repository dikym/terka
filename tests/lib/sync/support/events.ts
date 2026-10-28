import type { LearningEvent, PracticeRun } from "../../../../src/core/log/events";
import { localDay } from "../../../../src/core/time/day";
import { MINUTE, NOW, review, run, WITA } from "../../../core/replay/fixtures";

export { MINUTE, NOW, review, run, WITA };
export {
	cardEvent,
	factView,
	intro,
	sighting,
	voidOf,
	HOUR,
	DAY
} from "../../../core/replay/fixtures";

export const DAY_KEY = localDay(NOW, WITA);

// A session starts open and is closed by a second write, which is how the app records it.
export function openRun(
	kind: PracticeRun["kind"],
	at: number,
	overrides: Partial<PracticeRun> = {}
): LearningEvent {
	return run(kind, at, {
		endedAt: null,
		answered: null,
		correct: null,
		activeMs: null,
		placementLevel: null,
		...overrides
	});
}

export function closeOf(open: LearningEvent, at: number, overrides: Partial<PracticeRun> = {}) {
	if (open.table !== "practice_runs") throw new Error("only a session can be closed");
	return {
		...open,
		row: {
			...open.row,
			endedAt: at,
			answered: 3,
			correct: 3,
			activeMs: 9_000,
			placementLevel: open.row.kind === "placement" ? ("menengah" as const) : null,
			...overrides
		}
	} as LearningEvent;
}

export const answersOf = (open: LearningEvent, codes: string[], at: number) =>
	codes.map((code, index) =>
		review(code, "code2region", at + (index + 1) * MINUTE, { runId: open.row.id })
	);

export const idOf = (event: LearningEvent) => event.row.id;
