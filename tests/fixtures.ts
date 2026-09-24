import { createProgress } from "../src/lib/terka/content";
import { applyAnswer } from "../src/lib/terka/engine";
import {
	DAY,
	type Area,
	type Content,
	type Region,
	type RawReview,
	type Progress
} from "../src/lib/terka/model";

// Synthetic provenance is test data, never published as verified plate content.
export const region = (id: string, name: string, group = "island-a"): Region => ({
	id,
	code: id.toUpperCase(),
	region: name,
	group,
	province: `province-${id}`,
	spans: [],
	placementTier: "common",
	confidence: "high",
	aliases: [],
	areas: [{ areaId: `kota-${id}`, confidence: "high" }],
	facts: []
});
const cityOf = (id: string, name: string): Area => ({
	id: `kota-${id}`,
	type: "kota",
	name,
	province: `province-${id}`,
	aliases: [],
	variants: []
});
export const fixture = (): Content => ({
	version: "2026.09.15",
	sourceRevision: "fixture",
	regions: [
		region("be", "Lampung"),
		region("bd", "Bengkulu"),
		region("dk", "Bali", "island-b"),
		region("de", "Maluku", "island-c")
	],
	areas: [
		cityOf("be", "Lampung"),
		cityOf("bd", "Bengkulu"),
		cityOf("dk", "Bali"),
		cityOf("de", "Maluku")
	],
	facts: [],
	specialsVersion: "2026.09.24",
	sources: [],
	specials: [],
	referencePlates: []
});
export const NOW = Date.parse("2026-09-15T04:00:00Z");
export const raw = (overrides: Partial<RawReview> = {}): RawReview => ({
	id: "answer-1",
	questionId: "question-1",
	contentVersion: "2026.09.15",
	cardId: "be::code2region",
	regionId: "be",
	sessionId: "session",
	mode: "daily",
	ts: NOW,
	day: 0,
	level: 2,
	autoLevel: 2,
	correct: true,
	fuzzy: false,
	timedOut: false,
	msToFirstKey: 1_000,
	elapsedMs: 2_000,
	answers: ["Lampung"],
	confusedWith: [],
	setCorrect: null,
	setTarget: null,
	drillPair: null,
	scheduled: true,
	wasMature: false,
	...overrides
});

export const reviewing = (content = fixture()): Progress => {
	const progress = createProgress(content, NOW, "Asia/Makassar");
	for (const card of progress.cards.filter((card) => card.mode === "code2region"))
		Object.assign(card, {
			state: "review",
			stability: 5,
			difficulty: 5,
			interval: 5,
			reps: 3,
			lastReview: NOW - 5 * DAY
		});
	return progress;
};
export function answerCurrent(
	progress: Progress,
	content: Content,
	id: string,
	answer?: string[],
	now?: number
) {
	const question = progress.currentQuestion!;
	return applyAnswer(
		progress,
		content,
		{
			id,
			sessionId: progress.sessions.at(-1)!.id,
			questionId: question.id,
			now: now ?? question.shownAt + 1500,
			msToFirstKey: 500,
			answers: answer ?? [question.targets[0].name]
		},
		() => 0.5
	);
}
