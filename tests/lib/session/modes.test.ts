import { describe, expect, test } from "bun:test";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import type { LearningEvent } from "../../../src/core/log/events";
import { kilatCards, type PlanInput, planSession } from "../../../src/lib/session/modes";
import { DAY, intro, NOW, review, ruleBundle, run, stateOf } from "../../core/replay/fixtures";
import { ctxAt, SETTINGS } from "../../core/session/fixtures";

const bundle = ruleBundle();
const input = (events: LearningEvent[] = [], settings = SETTINGS): PlanInput => ({
	state: stateOf(events),
	bundle,
	dictionary: buildDictionary(bundle),
	settings,
	notes: new Map(),
	ctx: ctxAt(NOW)
});
const NO_PARAMS = { scope: null, code: null };
// BK introduced two days ago and answered once since, so it is learned.
const learned = [intro("bk", NOW - 2 * DAY), review("bk", "code2region", NOW - 2 * DAY + 60_000)];

describe("planning a session", () => {
	test("with nothing learned, practice modes have nothing to ask", () => {
		for (const mode of ["terfokus", "kilat", "harian"] as const) {
			const plan = planSession(mode, input(), NO_PARAMS);
			expect(plan.kind).toBe("empty");
			if (plan.kind === "empty")
				expect(plan.message).toBe("Belum ada materi yang bisa dilatih di wilayah ini.");
		}
	});

	test("a new learner's daily session introduces new material", () => {
		const plan = planSession("hariIni", input(), NO_PARAMS);
		expect(plan.kind).toBe("ready");
		if (plan.kind !== "ready") return;
		expect(plan.cards.length).toBeGreaterThan(0);
		expect(plan.cards.every((card) => card.form === "perkenalan")).toBe(true);
		expect(plan.run).toEqual({ kind: "daily", scope: SETTINGS.scope });
		expect(plan.preview?.title).toBe("Sesi hari ini");
	});

	test("an empty plan carries the mode's icon", () => {
		expect(planSession("diplomat", input(), NO_PARAMS)).toMatchObject({
			kind: "empty",
			icon: "flag"
		});
	});

	test("a finished challenge cannot be played again today", () => {
		const plan = planSession("harian", input([...learned, run("challenge", NOW)]), NO_PARAMS);
		expect(plan).toMatchObject({ kind: "empty", message: "Sudah selesai untuk hari ini" });
	});

	test("mode kilat draws its questions from learned codes", () => {
		const plan = planSession("kilat", input(learned), NO_PARAMS);
		expect(plan.kind).toBe("ready");
		const cards = kilatCards(input(learned), SETTINGS.scope, "run-1", 0, 3);
		expect(cards).toHaveLength(3);
		expect(cards.every((card) => card.question.context === "kilat")).toBe(true);
		expect(cards.every((card) => card.timer?.kind !== "start")).toBe(true);
	});

	test("a naming round needs a front code it can ask", () => {
		const plan = planSession("sebutkan", input(), { scope: null, code: "BK" });
		expect(plan.kind).toBe("empty");
		expect(planSession("sebutkan", input(), NO_PARAMS).kind).toBe("empty");
	});

	test("the placement test starts without a preview", () => {
		const plan = planSession("penempatan", input(), NO_PARAMS);
		expect(plan).toMatchObject({ kind: "ready", preview: null });
	});
});
