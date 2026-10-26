import { describe, expect, test } from "bun:test";
import { areaDisplayName, provinceName } from "../../../src/core/answers/dictionary";
import { buildQuestion } from "../../../src/core/questions/build";
import { baseRung, ladderScale, rungForLevel } from "../../../src/core/questions/rung";
import { newCard, type CardMemory } from "../../../src/core/scheduling/card-memory";
import { ruleBundle } from "../rules/fixtures";

const bundle = ruleBundle();
const card = (extra: Partial<CardMemory> = {}, cardId = "bk::code2region"): CardMemory => ({
	...newCard(cardId),
	...extra
});
const review = (stability: number, extra: Partial<CardMemory> = {}, cardId?: string) =>
	card(
		{ state: "review", stability, difficulty: 5, intervalDays: stability, reps: 3, ...extra },
		cardId
	);
const KEEP = { retrievability: 0.9, scale: 1 };
const results = (count: number, rate: number) =>
	Array.from({ length: count }, (_, index) => index < Math.round(count * rate));

describe("base rung", () => {
	test("follows the learning steps", () => {
		expect(baseRung(card({ state: "learning" }), "intro", KEEP)).toBe(1);
		expect(baseRung(card({ state: "new" }), "daily", KEEP)).toBe(1);
		expect(baseRung(card({ state: "learning", step: 1 }), "daily", KEEP)).toBe(2);
		expect(baseRung(card({ state: "relearning", stability: 30 }), "daily", KEEP)).toBe(3);
	});

	test("climbs with stability on review cards", () => {
		expect(baseRung(review(2), "daily", KEEP)).toBe(3);
		expect(baseRung(review(5), "daily", KEEP)).toBe(4);
		expect(baseRung(review(12), "daily", KEEP)).toBe(5);
		expect(baseRung(card({ state: "mature", stability: 40 }), "daily", KEEP)).toBe(6);
	});

	test("a smaller scale lets the same stability climb higher", () => {
		expect(baseRung(review(2), "daily", { retrievability: 0.9, scale: 0.5 })).toBe(4);
	});

	test("a hard or faded review card steps down", () => {
		expect(baseRung(review(5, { difficulty: 8 }), "daily", KEEP)).toBe(3);
		expect(
			baseRung(review(12, { difficulty: 8 }), "daily", { retrievability: 0.7, scale: 1 })
		).toBe(3);
	});

	test("a learning card is not stepped down by its empty memory", () => {
		expect(
			baseRung(card({ state: "learning", step: 1, difficulty: 9 }), "daily", {
				retrievability: 0,
				scale: 1
			})
		).toBe(2);
	});
});

describe("rung for level", () => {
	test("stays inside the level's band", () => {
		expect(rungForLevel(6, 1, "auto")).toBe(2);
		expect(rungForLevel(1, 2, "auto")).toBe(3);
		expect(rungForLevel(4, 2, "auto")).toBe(4);
		expect(rungForLevel(3, 3, "auto")).toBe(6);
	});

	test("a manual level takes the top of its band", () => {
		expect(rungForLevel(2, 2, "manual_up")).toBe(5);
		expect(rungForLevel(6, 1, "manual_down")).toBe(2);
		expect(rungForLevel(3, 3, "manual_up")).toBe(6);
	});
});

describe("ladder scale", () => {
	test("is neutral until there are enough results", () => {
		expect(ladderScale(results(99, 1))).toBe(1);
		expect(ladderScale(results(200, 0.85))).toBeCloseTo(1, 5);
	});

	test("speeds up a user who rarely misses and slows down one who often does", () => {
		expect(ladderScale(results(200, 0.95))).toBe(0.5);
		expect(ladderScale(results(200, 0.7))).toBe(2);
	});
});

describe("questions by rung", () => {
	test("an introduction offers provinces from other groups", () => {
		const question = buildQuestion(card(), bundle, { context: "intro", format: "choice" });
		expect(question.level).toBe(1);
		expect(question.questionType).toBe("choice");
		expect(question.answer).toEqual({
			kind: "literal",
			value: provinceName("sumatera-utara"),
			confusedWith: null
		});
		expect(question.choices).toHaveLength(4);
		expect(question.choices).toContain(provinceName("sumatera-utara"));
	});

	test("a set card's introduction keeps its scope distractors", () => {
		const sumatera = new Set(
			bundle.regions
				.filter((region) => region.group === "sumatera")
				.flatMap((region) => region.areas.map((membership) => membership.areaId))
				.map((id) => areaDisplayName(bundle.areas.find((area) => area.id === id)!))
		);
		for (let reps = 0; reps < 5; reps++) {
			const question = buildQuestion(card({ reps }, "bk::setrecall"), bundle, {
				context: "intro",
				scope: { level: "group", id: "sumatera" }
			});
			expect(question.choices).toHaveLength(4);
			expect(question.choices.every((choice) => sumatera.has(choice))).toBe(true);
		}
	});

	test("a code spanning provinces skips the province rung", () => {
		const question = buildQuestion(card({}, "b::code2region"), bundle, {
			context: "intro",
			format: "choice"
		});
		expect(question.answer).toEqual({ kind: "area", codeId: "b" });
	});

	test("a young review card gets a choice at level two", () => {
		const question = buildQuestion(review(1), bundle, { context: "daily", format: "choice" });
		expect(question.level).toBe(2);
		expect(question.questionType).toBe("choice");
		expect(question.choices).toHaveLength(4);
	});

	test("cek ingatan always asks for recall, however weak the card", () => {
		const question = buildQuestion(review(1, { difficulty: 9 }), bundle, {
			context: "recheck",
			format: "choice"
		});
		expect(question.level).toBe(2);
		expect(question.questionType).toBe("typed");
	});

	test("a steady review card is typed at level two", () => {
		const question = buildQuestion(review(15), bundle, { context: "daily", format: "choice" });
		expect(question.level).toBe(2);
		expect(question.questionType).toBe("typed");
	});

	test("a mature card in kilat gets area names, never provinces", () => {
		const question = buildQuestion(card({ state: "mature", stability: 40 }), bundle, {
			context: "kilat",
			format: "choice"
		});
		expect(question.level).toBe(1);
		expect(question.answer).toEqual({ kind: "area", codeId: "bk" });
	});

	test("a weak review card in kilat still gets area names", () => {
		const weak = review(2, { difficulty: 8 });
		expect(baseRung(weak, "kilat", { retrievability: 0.7, scale: 1 })).toBe(3);
		const question = buildQuestion(weak, bundle, { context: "kilat", format: "choice" });
		expect(question.answer).toEqual({ kind: "area", codeId: "bk" });
	});

	test("level two never asks true or false or odd one out", () => {
		for (const format of ["truefalse", "oddoneout"] as const) {
			const question = buildQuestion(review(1), bundle, { context: "daily", format });
			expect(question.level).toBe(2);
			expect(question.questionType).toBe("choice");
			expect(question.choices).toHaveLength(4);
		}
	});

	test("a manual level one on a review card gets area names, never provinces", () => {
		const question = buildQuestion(review(15), bundle, {
			context: "daily",
			level: 1,
			format: "choice"
		});
		expect(question.levelSource).toBe("manual_down");
		expect(question.answer).toEqual({ kind: "area", codeId: "bk" });
	});

	test("the middle rung draws choice or typing per card, the same way every time", () => {
		const forms = new Set<string>();
		for (let reps = 0; reps < 20; reps++) {
			const ask = () =>
				buildQuestion(review(5, { reps }), bundle, { context: "daily", format: "choice" })
					.questionType;
			expect(ask()).toBe(ask());
			forms.add(ask());
		}
		expect(forms).toEqual(new Set(["choice", "typed"]));
	});
});
