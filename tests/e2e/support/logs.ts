import type { Bundle } from "../../../src/core/content/schema";
import type { LearningEvent } from "../../../src/core/log/events";
import type { CardMode } from "../../../src/core/questions/question";
import { seeded } from "../../../src/core/random";
import { universe } from "../../../src/core/replay/universe";
import { localDay } from "../../../src/core/time/day";
import { DAY, MINUTE, NOW, review as fixtureReview } from "../../core/replay/fixtures";
import { randomLog } from "../../core/replay/generator";
import { withUuids } from "../../lib/db/fixtures";

const choice = { level: 1, questionType: "choice" } as const;

// The page runs in the machine's zone. A log stamped in another zone puts its last day ahead of
// the page's today for part of every day, and anything recorded after it lands in the future.
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const review: typeof fixtureReview = (contentId, mode, at, overrides) =>
	fixtureReview(contentId, mode, at, { localDay: localDay(at, zone), tz: zone, ...overrides });

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

// Codes learned over the past two months, so practice modes have material today. Codes in
// `naming` also get their Sebutkan card opened and introduced.
export function learnedLog(
	regionIds: string[],
	naming: string[] = [],
	now = Date.now()
): LearningEvent[] {
	const start = now - 60 * DAY;
	const offsets = [0, MINUTE, 11 * MINUTE, 3 * DAY, 10 * DAY, 30 * DAY];
	const events = regionIds.flatMap((id, index) =>
		offsets.map((offset, step) =>
			review(id, "code2region", start + index * 30 * MINUTE + offset, {
				...choice,
				...(step === 0 ? { context: "intro" as const } : {})
			})
		)
	);
	const sets = naming.flatMap((id) => [
		review(id, "setrecall", start + 31 * DAY, { ...choice, context: "intro" }),
		review(id, "setrecall", start + 31 * DAY + MINUTE, choice)
	]);
	return withUuids([...events, ...sets]);
}

// Codes whose learning steps finished minutes ago, so nothing is due again today.
export function justLearnedLog(regionIds: string[], now = Date.now()): LearningEvent[] {
	const start = now - 30 * MINUTE;
	return withUuids(
		regionIds.flatMap((id) => [
			review(id, "code2region", start, { ...choice, context: "intro" }),
			review(id, "code2region", start + MINUTE, choice),
			review(id, "code2region", start + 11 * MINUTE, choice)
		])
	);
}

/** BK learned, then missed once: enough to put it in the weakest codes table. */
export function missedLog(now = Date.now()): LearningEvent[] {
	const learned = learnedLog(["bk"], [], now - DAY);
	const miss = review("bk", "code2region", now - MINUTE, {
		...choice,
		correct: false,
		matchType: "none"
	});
	return [...learned, ...withUuids([miss])];
}
