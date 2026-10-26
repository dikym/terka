import { describe, expect, test } from "bun:test";
import { buildQuestion } from "../../../src/core/questions/build";
import type { QueueItem } from "../../../src/core/session/context";
import {
	buildPreview,
	durationRange,
	kilatPreview,
	PLACEMENT_PREVIEW,
	questionMs,
	previewStale,
	type PreviewExtras
} from "../../../src/core/session/preview";
import { DAY, fresh, MINUTE, NOW, reviewCard, ruleBundle, seedCard } from "../replay/fixtures";
import { ctxAt, SETTINGS, SUMATERA } from "./fixtures";

const bundle = ruleBundle();
const at = ctxAt(NOW + 3_600_000);
const extras = (overrides: Partial<PreviewExtras> = {}): PreviewExtras => ({
	held: false,
	lastInputMode: "keyboard",
	completedSessions: 10,
	revision: "r1",
	...overrides
});
const CODES = ["bk", "bb", "ba", "bm", "bp", "be", "bd", "a", "b", "ab", "p", "r", "dk", "dr"];
const intros = (codes: string[]): QueueItem[] =>
	codes.map((code) => ({
		cardId: `${code}::code2region`,
		context: "intro",
		slot: "new",
		format: "choice"
	}));
function reviews(state: ReturnType<typeof fresh>, codes: string[]): QueueItem[] {
	return codes.map((code) => {
		seedCard(state, `${code}::code2region`, reviewCard({ intervalDays: 10 }));
		return { cardId: `${code}::code2region`, context: "daily", slot: "review" };
	});
}

describe("estimate", () => {
	test("without history, four introductions with their re-asks and ten Level 2 reviews take two to three minutes", () => {
		const state = fresh();
		const items = [...intros(CODES.slice(0, 4)), ...reviews(state, CODES.slice(4, 14))];
		const preview = buildPreview(state, bundle, items, SETTINGS, at, extras());
		expect(preview.reasks).toBe(4);
		expect(preview.estimatedMs).toBe(160_000);
		expect(preview.range).toEqual({ kind: "minutes", min: 2, max: 3 });
		expect(preview.counts).toEqual({ step: 0, drill: 0, review: 10, new: 4 });
		expect(preview.byLevel).toEqual({ 1: 4, 2: 10, 3: 0 });
		expect(preview.byType.typed).toBe(10);
	});
	test("with 30 samples a question takes the personal median plus reading time", () => {
		const state = fresh();
		state.durations.set("typed|2|keyboard", Array<number>(30).fill(5_000));
		const preview = buildPreview(state, bundle, reviews(state, ["bk"]), SETTINGS, at, extras());
		expect(preview.estimatedMs).toBe(7_000);
	});
	test("under a minute is shown as such", () => {
		expect(durationRange(45_000)).toEqual({ kind: "under-minute" });
		expect(durationRange(300_000)).toEqual({ kind: "minutes", min: 4, max: 6 });
	});
});

describe("info items", () => {
	test("at most three, in priority order", () => {
		const state = fresh();
		state.tier.changedOn = "2026-09-21";
		seedCard(state, "dk::code2region", reviewCard({ state: "mature", lapses: 6 }));
		const items: QueueItem[] = [
			{ cardId: "dk::code2region", context: "daily", slot: "review" }
		];
		const preview = buildPreview(
			state,
			bundle,
			items,
			{ ...SETTINGS, scope: SUMATERA },
			at,
			extras({ held: true, completedSessions: 0 })
		);
		expect(preview.info).toEqual(["held", "tier-changed", "timed"]);
	});
	test("the keyboard hint shows only in the first five sessions and only after keyboard input", () => {
		const state = fresh();
		const items = reviews(state, ["bk"]);
		expect(
			buildPreview(state, bundle, items, SETTINGS, at, extras({ completedSessions: 4 })).info
		).toContain("keyboard");
		expect(
			buildPreview(state, bundle, items, SETTINGS, at, extras({ completedSessions: 5 })).info
		).not.toContain("keyboard");
		expect(
			buildPreview(
				state,
				bundle,
				items,
				SETTINGS,
				at,
				extras({ completedSessions: 0, lastInputMode: "touch" })
			).info
		).not.toContain("keyboard");
	});
	test("a due review outside the scope is announced", () => {
		const state = fresh();
		const items = reviews(state, ["dk"]);
		expect(
			buildPreview(state, bundle, items, { ...SETTINGS, scope: SUMATERA }, at, extras()).info
		).toContain("outside-scope");
	});
});

describe("staleness", () => {
	const state = fresh();
	const preview = buildPreview(
		state,
		bundle,
		reviews(state, ["bk"]),
		SETTINGS,
		ctxAt(NOW + 2 * 3_600_000),
		extras()
	);
	test("more than ten minutes, a new day, or a new state revision rebuild the queue", () => {
		expect(previewStale(preview, ctxAt(NOW + 2 * 3_600_000 + 5 * MINUTE), "r1")).toBe(false);
		expect(previewStale(preview, ctxAt(NOW + 2 * 3_600_000 + 11 * MINUTE), "r1")).toBe(true);
		expect(previewStale(preview, ctxAt(NOW + 2 * 3_600_000 + MINUTE), "r2")).toBe(true);
		expect(previewStale(preview, ctxAt(NOW + DAY), "r1")).toBe(true);
	});
	test("opened at 23:55 and started at 00:02 is a new day", () => {
		const early = buildPreview(state, bundle, [], SETTINGS, ctxAt(NOW - 5 * MINUTE), extras());
		expect(previewStale(early, ctxAt(NOW + 2 * MINUTE), "r1")).toBe(true);
	});
});

describe("fixed-length previews", () => {
	test("Kilat shows 60 seconds and the record of its scope", () => {
		const state = fresh();
		state.kilatRecords.set("group|sumatera", 24);
		expect(kilatPreview(state, SUMATERA)).toEqual({ durationMs: 60_000, record: 24 });
	});
	test("placement shows at most 28 questions and about three minutes", () => {
		expect(PLACEMENT_PREVIEW).toEqual({ maxQuestions: 28, approxMinutes: 3 });
	});
});

describe("question duration", () => {
	test("a level two choice is estimated as a choice, not as typing", () => {
		const state = fresh();
		const entry = seedCard(
			state,
			"dk::code2region",
			reviewCard({ stability: 1, intervalDays: 1, lastReviewAt: NOW - DAY })
		);
		const question = buildQuestion(entry, bundle, { context: "daily" });
		expect(question.level).toBe(2);
		expect(question.questionType).toBe("choice");
		const item: QueueItem = { cardId: entry.cardId, context: "daily", slot: "review" };
		expect(questionMs(state, question, item, "keyboard")).toBe(4_000);
	});
});
