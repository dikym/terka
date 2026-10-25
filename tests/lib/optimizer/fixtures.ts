import type { LearningEvent } from "../../../src/core/log/events";
import { seeded } from "../../../src/core/random";
import { DAY, intro, manyRegions, MINUTE, NOW, review } from "../../core/replay/fixtures";
import { withUuids } from "../db/fixtures";

export const CARDS = 300;
export const bundle = manyRegions(CARDS);

// Each card: introduction, one learning step, then reviews every 40 days; enough counted answers to pass the first-run threshold.
export function eligibleLog(seed = "eligible"): LearningEvent[] {
	const random = seeded(seed);
	const events: LearningEvent[] = [];
	for (let index = 0; index < CARDS; index++) {
		const id = `x${index}`;
		const start = NOW + index * 10 * MINUTE;
		const choice = { level: 1, questionType: "choice" } as const;
		events.push(intro(id, start), review(id, "code2region", start + MINUTE, choice));
		for (const days of [30, 70, 110, 150, 190]) {
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
