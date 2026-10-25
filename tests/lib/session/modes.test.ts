import { describe, expect, test } from "bun:test";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import type { LearningEvent } from "../../../src/core/log/events";
import { kilatCards, type PlanInput, planSession, reaskCard } from "../../../src/lib/session/modes";
import {
	DAY,
	intro,
	manyRegions,
	NOW,
	review,
	ruleBundle,
	run,
	stateOf
} from "../../core/replay/fixtures";
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

describe("re-asking inside a session", () => {
	const justIntroduced = [intro("bk", NOW - 60_000)];

	test("a just-introduced card gets a step re-ask in a daily session", () => {
		const card = reaskCard(
			input(justIntroduced),
			"hariIni",
			"bk::code2region",
			SETTINGS.scope,
			1
		);
		expect(card).not.toBeNull();
		expect(card!.id).toBe("bk::code2region#r1");
		expect(card!.question.context).toBe("daily");
		expect(card!.form).not.toBe("perkenalan");
	});
	test("a lapsed card gets a re-ask in its own session's context", () => {
		const lapsed = [
			intro("bk", NOW - 30 * DAY),
			review("bk", "code2region", NOW - 30 * DAY + 60_000),
			review("bk", "code2region", NOW - 60_000, { correct: false, context: "focused" })
		];
		const card = reaskCard(input(lapsed), "terfokus", "bk::code2region", SETTINGS.scope, 2);
		expect(card?.question.context).toBe("focused");
	});
	test("a settled card gets no re-ask", () => {
		expect(
			reaskCard(input(learned), "hariIni", "bk::code2region", SETTINGS.scope, 1)
		).toBeNull();
	});
	test("Kilat, the challenge and the placement test never re-ask", () => {
		for (const mode of ["kilat", "harian", "penempatan"] as const)
			expect(
				reaskCard(input(justIntroduced), mode, "bk::code2region", SETTINGS.scope, 1)
			).toBeNull();
	});
});

describe("planning cek ingatan", () => {
	// Every region code learned a month ago and due now (56 codes), last practised eight days ago.
	const away = (): PlanInput => {
		const many = manyRegions(40);
		const state = stateOf([], many);
		for (const cardId of [...state.cards.keys()].filter((id) => id.endsWith("::code2region")))
			state.cards.set(cardId, {
				...state.cards.get(cardId)!,
				state: "review",
				stability: 20,
				difficulty: 5,
				intervalDays: 20,
				reps: 3,
				lastReviewAt: NOW - 30 * DAY,
				due: NOW - DAY,
				scheduledDay: "2026-08-22"
			});
		state.activeDays.add("2026-09-13");
		return { ...input(), state, bundle: many, dictionary: buildDictionary(many) };
	};

	test("cek plans the recheck items with a skip link", () => {
		const plan = planSession("cek", away(), NO_PARAMS);
		expect(plan.kind).toBe("ready");
		if (plan.kind !== "ready") return;
		expect(plan.run.kind).toBe("recheck");
		expect(plan.cards.every((card) => card.question.context === "recheck")).toBe(true);
		expect(plan.preview?.title).toBe("Cek ingatan");
		expect(plan.preview?.skip).toEqual({ label: "Lewati, mulai sesi biasa", href: "/sesi" });
		expect(plan.preview?.description).toBe(
			`Sudah 8 hari sejak latihan terakhir. Jawab ${plan.cards.length} soal untuk melihat seberapa banyak yang masih kamu ingat.`
		);
		expect(plan.predicted?.size).toBeGreaterThan(0);
	});
	test("cek with no offer falls back to an empty plan", () => {
		const plan = planSession("cek", input(), NO_PARAMS);
		expect(plan.kind).toBe("empty");
		if (plan.kind === "empty")
			expect(plan.message).toBe("Tidak ada soal yang perlu diulang hari ini.");
	});
});

describe("re-asking at the edges", () => {
	const justIntroduced = [intro("bk", NOW - 60_000)];

	test("each scheduling mode re-asks in its own context", () => {
		const contexts = {
			hariIni: "daily",
			terfokus: "focused",
			diplomat: "special",
			sebutkan: "setrecall",
			cek: "recheck"
		} as const;
		for (const [mode, context] of Object.entries(contexts))
			expect(
				reaskCard(
					input(justIntroduced),
					mode as keyof typeof contexts,
					"bk::code2region",
					SETTINGS.scope,
					1
				)?.question.context
			).toBe(context);
	});
	test("a card not due yet, suspended, or unknown gets no re-ask", () => {
		const future = input([intro("bk", NOW + 60_000)]);
		expect(reaskCard(future, "hariIni", "bk::code2region", SETTINGS.scope, 1)).toBeNull();
		const suspended = input(justIntroduced);
		const card = suspended.state.cards.get("bk::code2region")!;
		suspended.state.cards.set("bk::code2region", {
			...card,
			state: "suspended",
			suspension: { reason: "manual", resume: "learning" }
		});
		expect(reaskCard(suspended, "hariIni", "bk::code2region", SETTINGS.scope, 1)).toBeNull();
		expect(reaskCard(input(), "hariIni", "zz::code2region", SETTINGS.scope, 1)).toBeNull();
	});
	test("serials keep two re-asks of one card apart", () => {
		const first = reaskCard(
			input(justIntroduced),
			"hariIni",
			"bk::code2region",
			SETTINGS.scope,
			1
		);
		const second = reaskCard(
			input(justIntroduced),
			"hariIni",
			"bk::code2region",
			SETTINGS.scope,
			2
		);
		expect(first!.id).not.toBe(second!.id);
	});
});
