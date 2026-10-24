import type { Bundle } from "../../../src/core/content/schema";
import type { LearningEvent } from "../../../src/core/log/events";
import type { CardMode } from "../../../src/core/questions/question";
import { seeded } from "../../../src/core/random";
import { universe } from "../../../src/core/replay/universe";
import { DAY, MINUTE, NOW, review } from "../../core/replay/fixtures";
import { randomLog } from "../../core/replay/generator";
import { withUuids } from "../../lib/db/fixtures";

const choice = { level: 1, questionType: "choice" } as const;

function learn(contentId: string, mode: CardMode, start: number, random: () => number) {
	const events = [
		review(contentId, mode, start, { ...choice, context: "intro" }),
		review(contentId, mode, start + MINUTE, choice),
		review(contentId, mode, start + 11 * MINUTE, choice)
	];
	for (const days of [30, 120, 300, 600]) {
		const correct = random() < 0.85;
		events.push(
			review(contentId, mode, start + days * DAY, {
				...choice,
				correct,
				...(correct ? {} : { matchType: "none" })
			})
		);
	}
	return events;
}

// Real content cards, enough counted answers and cards for the first optimization.
export function eligibleLog(bundle: Bundle): LearningEvent[] {
	const random = seeded("e2e");
	const open = universe(bundle).filter((card) => !card.locked);
	const events = open.flatMap(({ cardId }, index) => {
		const [contentId, mode] = cardId.split("::") as [string, CardMode];
		return learn(contentId, mode, NOW + index * 10 * MINUTE, random);
	});
	// region2code opens once code2region reaches a 7-day interval, after its 30-day review.
	const reverse = bundle.regions.flatMap((region, index) =>
		learn(region.id, "region2code", NOW + 31 * DAY + index * 10 * MINUTE, random)
	);
	return withUuids([...events, ...reverse]);
}

export const replayLog = () => withUuids(randomLog("e2e-replay", 20_000, { voids: true }));
