import { describe, expect, test } from "bun:test";
import type { PracticeRun, ReviewLog } from "../../../src/core/log/events";
import { buildQuestion } from "../../../src/core/questions/build";
import { NATIONAL } from "../../../src/core/questions/distractors";
import { applyEvent } from "../../../src/core/replay/apply";
import { effectiveCard } from "../../../src/core/replay/universe";
import { checkAnswer } from "../../../src/core/session/check";
import { answerEvent, startRun } from "../../../src/core/session/commands";
import { setrecallQueue } from "../../../src/core/session/modes";
import { placementNext } from "../../../src/core/session/placement";
import { buildPreview } from "../../../src/core/session/preview";
import { fresh, NOW, reviewCard, ruleBundle, seedCard } from "../replay/fixtures";
import { ctxAt, dictionary, SETTINGS } from "./fixtures";

const bundle = ruleBundle();

describe("set card introduction", () => {
	test("is a single answer that replay accepts as an introduction without set columns", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", { state: "new" });
		const [item] = setrecallQueue(state, "dk", ctxAt(NOW)) as {
			cardId: string;
			context: "intro";
		}[];
		const question = buildQuestion(effectiveCard(state, item.cardId)!, bundle, {
			context: item.context
		});
		const response = { choice: question.choices[0] ?? "Denpasar" };
		const event = answerEvent(
			question,
			response,
			checkAnswer(question, response, bundle, dictionary),
			{
				msToFirstKey: 1000,
				msTotal: 2000,
				msTyping: null,
				keyGapsMs: null,
				deletedChars: 0,
				optionChanges: 0,
				optionCount: 4,
				inputMode: "touch",
				interrupted: false,
				timedOut: false
			},
			ctxAt(NOW),
			{ runId: null, contentVersion: 1 }
		);
		const row = event.row as ReviewLog;
		expect(row).toMatchObject({
			context: "intro",
			setItems: null,
			setCorrect: null,
			setThreshold: null
		});
		applyEvent(state, event);
		expect(state.diagnostics).toEqual([]);
		expect(state.cards.get("dk::setrecall")?.state).toBe("learning");
		expect(state.introDay.get("dk")).toBe("2026-09-21");
	});
});

describe("estimate stored as whole milliseconds", () => {
	test("an even number of samples still gives an integer estimate", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard({ intervalDays: 10 }));
		state.durations.set("typed|2|keyboard", [
			...Array<number>(15).fill(4000),
			...Array<number>(15).fill(4001)
		]);
		const preview = buildPreview(
			state,
			bundle,
			[{ cardId: "bk::code2region", context: "daily", slot: "review" }],
			SETTINGS,
			ctxAt(NOW + 3_600_000),
			{ held: false, lastInputMode: "keyboard", completedSessions: 9, revision: "r" }
		);
		expect(Number.isInteger(preview.estimatedMs)).toBe(true);
		const run = startRun("daily", NATIONAL, ctxAt(NOW), {
			estimatedMs: preview.estimatedMs,
			plannedCount: 1
		}).row as PracticeRun;
		expect(Number.isInteger(run.estimatedMs)).toBe(true);
	});
});

describe("placement with small tiers", () => {
	test("a stage with fewer codes ends when its codes are answered, with a pass mark scaled to its size", () => {
		const sizes = { 1: 4, 2: 5, 3: 3 } as const;
		const four = [true, true, false, false].map((correct) => ({ stage: 1 as const, correct }));
		expect(placementNext(four, sizes)).toEqual({ stage: 2 });
		const oneOfFour = [true, false, false, false].map((correct) => ({
			stage: 1 as const,
			correct
		}));
		expect(placementNext(oneOfFour, sizes)).toEqual({ done: "pemula" });
	});
});
