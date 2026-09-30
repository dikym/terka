import type { LearningEvent } from "../../../src/core/log/events";
import type { CardMode } from "../../../src/core/questions/question";
import { seeded } from "../../../src/core/random";
import { cardEvent, factView, HOUR, NOW, review, run, sighting, voidOf } from "./fixtures";

const CODES = [
	"bk",
	"bb",
	"ba",
	"bm",
	"bp",
	"be",
	"bd",
	"a",
	"b",
	"ab",
	"p",
	"r",
	"dk",
	"dr",
	"ea",
	"db"
];
const MODES: CardMode[] = ["code2region", "code2region", "region2code", "setrecall"];
const CONTEXTS = ["daily", "daily", "daily", "focused", "drill", "challenge", "kilat"] as const;

// Arbitrary but valid logs: replay must accept any of them, in any arrival order.
export function randomLog(
	seed: string,
	count: number,
	options: { voids?: boolean } = {}
): LearningEvent[] {
	const random = seeded(seed);
	const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)];
	const events: LearningEvent[] = [];
	let at = NOW;
	for (let index = 0; index < count; index++) {
		at += Math.floor(random() * 6 * HOUR);
		const id = `${seed}-${String(index).padStart(6, "0")}`;
		const deviceId = pick(["device-a", "device-b"]);
		const receivedAt = random() < 0.3 ? at + Math.floor((random() - 0.5) * 2 * HOUR) : null;
		const code = pick(CODES);
		const roll = random();
		if (roll < 0.15) {
			events.push(
				review(code, "code2region", at, {
					id,
					deviceId,
					receivedAt,
					context: "intro",
					level: 1,
					questionType: "choice"
				})
			);
		} else if (roll < 0.8) {
			const mode = pick(MODES);
			const correct = random() < 0.8;
			const set = mode === "setrecall";
			events.push(
				review(code, mode, at, {
					id,
					deviceId,
					receivedAt,
					context: pick(CONTEXTS),
					level: pick([1, 2, 3] as const),
					correct,
					matchType: correct ? "exact" : "none",
					confusedWith: correct ? null : pick(CODES),
					drillPairWith: pick(CODES),
					msToFirstKey: 500 + Math.floor(random() * 5000),
					questionType: set ? "setrecall" : "typed",
					setCorrect: set ? Math.floor(random() * 6) : null,
					setThreshold: set ? 2 : null
				})
			);
		} else if (roll < 0.85) {
			events.push(
				cardEvent(code, "code2region", pick(["suspend", "unsuspend"] as const), at, {
					id,
					deviceId,
					receivedAt
				})
			);
		} else if (roll < 0.9) {
			events.push(sighting(code, at, { id, deviceId, receivedAt }));
		} else if (roll < 0.95) {
			const kind = pick(["challenge", "kilat"] as const);
			events.push(
				run(kind, at, {
					id,
					deviceId,
					receivedAt,
					score: kind === "kilat" ? Math.floor(random() * 40) : null
				})
			);
		} else if (options.voids && events.length) {
			const target = pick(events.filter((event) => event.table === "review_logs"));
			if (target) events.push(voidOf(target, at, { id }));
		} else {
			events.push(factView("f-001", at, { id, deviceId, receivedAt }));
		}
	}
	return events;
}
