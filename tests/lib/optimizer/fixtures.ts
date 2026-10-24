import type { LearningEvent } from "../../../src/core/log/events";
import { seeded } from "../../../src/core/random";
import { DAY, intro, manyRegions, MINUTE, NOW, review } from "../../core/replay/fixtures";
import { withUuids } from "../db/fixtures";

export const CARDS = 260;
export const bundle = manyRegions(CARDS);

// Each card: introduction, two learning steps, then reviews 30 and 120 days later (4 counted answers).
export function eligibleLog(seed = "eligible"): LearningEvent[] {
	const random = seeded(seed);
	const events: LearningEvent[] = [];
	for (let index = 0; index < CARDS; index++) {
		const id = `x${index}`;
		const start = NOW + index * 10 * MINUTE;
		const choice = { level: 1, questionType: "choice" } as const;
		events.push(
			intro(id, start),
			review(id, "code2region", start + MINUTE, choice),
			review(id, "code2region", start + 11 * MINUTE, choice)
		);
		for (const days of [30, 120]) {
			const correct = random() < 0.85;
			events.push(
				review(id, "code2region", start + days * DAY, {
					...choice,
					correct,
					...(correct ? {} : { matchType: "none" })
				})
			);
		}
	}
	return withUuids(events);
}

export const AFTER_LOG = NOW + 200 * DAY;
