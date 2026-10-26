import type { Bundle } from "../content/schema";
import type { Grade } from "../grading/signals";
import type { LearningEvent } from "../log/events";
import { replay } from "../replay/replay";

// One answer that updated a schedule: the optimizer's training data.
export type CountedAnswer = {
	id: string;
	cardId: string;
	at: number;
	localDay: string;
	grade: Grade;
	settled: boolean;
	correct: boolean;
	serverSeq: number | null;
	msTotal: number;
	// A Level 2 choice may be recognition, not recall: it moves the schedule but is not a training target.
	recognized?: boolean;
};

export function countedAnswers(
	events: readonly LearningEvent[],
	bundle: Bundle
): CountedAnswer[] | null {
	const result = replay(events, bundle, { collect: true });
	return result.status === "ok" ? result.state.counted! : null;
}
