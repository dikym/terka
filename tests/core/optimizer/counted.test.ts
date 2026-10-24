import { describe, expect, test } from "bun:test";
import type { LearningEvent } from "../../../src/core/log/events";
import { countedAnswers } from "../../../src/core/optimizer/counted";
import { replay } from "../../../src/core/replay/replay";
import { DAY, intro, MINUTE, NOW, review, ruleBundle, run, voidOf } from "../replay/fixtures";

const choice = { level: 1, questionType: "choice" } as const;
const learned = (): LearningEvent[] => [
	intro("dk", NOW),
	review("dk", "code2region", NOW + MINUTE, choice),
	review("dk", "code2region", NOW + 11 * MINUTE, choice)
];
const counted = (events: LearningEvent[]) => countedAnswers(events, ruleBundle())!;

describe("countedAnswers", () => {
	test("collects the answers that updated a schedule, not the introduction", () => {
		const events = learned();
		const result = counted(events);
		expect(result.map((answer) => answer.id)).toEqual([events[1].row.id, events[2].row.id]);
		expect(result[0]).toMatchObject({
			cardId: "dk::code2region",
			at: NOW + MINUTE,
			localDay: "2026-09-21",
			grade: expect.any(Number),
			settled: false,
			correct: true,
			serverSeq: null
		});
	});

	test("marks an answer on a card that was already in review as settled", () => {
		const result = counted([...learned(), review("dk", "code2region", NOW + 30 * DAY, choice)]);
		expect(result.map((answer) => answer.settled)).toEqual([false, false, true]);
	});

	test("skips challenge and kilat answers", () => {
		const result = counted([
			...learned(),
			review("dk", "code2region", NOW + 30 * DAY, { ...choice, context: "challenge" }),
			review("dk", "code2region", NOW + 30 * DAY + MINUTE, { ...choice, context: "kilat" })
		]);
		expect(result).toHaveLength(2);
	});

	test("skips a voided answer", () => {
		const events = learned();
		expect(counted([...events, voidOf(events[2], NOW + 12 * MINUTE)])).toHaveLength(1);
	});

	test("skips a focused answer on a card that is not due yet", () => {
		const result = counted([
			...learned(),
			review("dk", "code2region", NOW + 12 * MINUTE, { ...choice, context: "focused" })
		]);
		expect(result).toHaveLength(2);
	});

	test("skips placement answers", () => {
		const placement = run("placement", NOW, { endedAt: NOW + 10 * MINUTE });
		const result = counted([
			placement,
			review("dk", "code2region", NOW + MINUTE, {
				...choice,
				context: "placement",
				runId: placement.row.id
			})
		]);
		expect(result).toEqual([]);
	});

	test("leaves the ordinary replay state without a collection", () => {
		const result = replay(learned(), ruleBundle());
		expect(result.status === "ok" && result.state.counted).toBeUndefined();
	});
});
