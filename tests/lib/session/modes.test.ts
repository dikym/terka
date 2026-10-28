import { describe, expect, test } from "bun:test";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import type { LearningEvent } from "../../../src/core/log/events";
import {
	kilatCards,
	type PlanInput,
	planSession,
	reaskCard,
	reaskPosition
} from "../../../src/lib/session/modes";
import { buildPreview } from "../../../src/core/session/preview";
import { dailyQueue } from "../../../src/core/session/queue";
import {
	DAY,
	fresh,
	HOUR,
	intro,
	manyRegions,
	NOW,
	review,
	reviewCard,
	ruleBundle,
	run,
	seedCard,
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
	test("the preview counts the same question forms the session builds", () => {
		const state = fresh();
		state.levelTwoResults = Array.from({ length: 200 }, () => true);
		for (const code of ["bk", "bb", "ba", "bm", "bp", "be", "bd", "a", "ab", "p", "r", "dk"])
			seedCard(
				state,
				`${code}::code2region`,
				reviewCard({
					stability: 2,
					intervalDays: 2,
					lastReviewAt: NOW - DAY,
					due: NOW - HOUR
				})
			);
		const plan = planSession("harian", { ...input(), state }, NO_PARAMS);
		expect(plan.kind).toBe("ready");
		if (plan.kind !== "ready") return;
		const session: Record<string, number> = {};
		for (const card of plan.cards)
			session[card.question.questionType] = (session[card.question.questionType] ?? 0) + 1;
		const { items } = dailyQueue(state, bundle, SETTINGS, ctxAt(NOW));
		const preview = buildPreview(state, bundle, items, SETTINGS, ctxAt(NOW), {
			held: false,
			lastInputMode: null,
			completedSessions: 0,
			revision: ""
		});
		expect(session.typed).toBeGreaterThan(0);
		expect(preview.byType).toEqual(session);
	});

	test("with nothing learned, practice modes have nothing to ask", () => {
		for (const mode of ["terfokus", "kilat", "tantangan"] as const) {
			const plan = planSession(mode, input(), NO_PARAMS);
			expect(plan.kind).toBe("empty");
			if (plan.kind === "empty")
				expect(plan.message).toBe("Belum ada materi yang bisa dilatih di wilayah ini.");
		}
	});

	test("a new learner's daily session introduces new material", () => {
		const plan = planSession("harian", input(), NO_PARAMS);
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
		const plan = planSession(
			"tantangan",
			input([...learned, run("challenge", NOW)]),
			NO_PARAMS
		);
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
			"harian",
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
			reaskCard(input(learned), "harian", "bk::code2region", SETTINGS.scope, 1)
		).toBeNull();
	});
	test("Kilat, the challenge and the placement test never re-ask", () => {
		for (const mode of ["kilat", "tantangan", "penempatan"] as const)
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
		expect(plan.preview?.skip).toEqual({
			label: "Lewati, mulai sesi biasa",
			href: "/sesi?mode=harian"
		});
		expect(plan.preview?.description).toBe(
			`Sudah 8 hari sejak latihan terakhir. Jawab ${plan.cards.length} soal untuk melihat seberapa banyak yang masih kamu ingat.`
		);
		expect(plan.predicted?.size).toBeGreaterThan(0);
	});
	test("cek with no offer falls back to an empty plan", () => {
		const plan = planSession("cek", input(), NO_PARAMS);
		expect(plan.kind).toBe("empty");
		if (plan.kind === "empty")
			expect(plan.message).toBe("Cek ingatan ditawarkan setelah libur panjang.");
	});
});

describe("re-asking at the edges", () => {
	const justIntroduced = [intro("bk", NOW - 60_000)];

	test("each scheduling mode re-asks in its own context", () => {
		const contexts = {
			harian: "daily",
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
		expect(reaskCard(future, "harian", "bk::code2region", SETTINGS.scope, 1)).toBeNull();
		const suspended = input(justIntroduced);
		const card = suspended.state.cards.get("bk::code2region")!;
		suspended.state.cards.set("bk::code2region", {
			...card,
			state: "suspended",
			suspension: { reason: "manual", resume: "learning" }
		});
		expect(reaskCard(suspended, "harian", "bk::code2region", SETTINGS.scope, 1)).toBeNull();
		expect(reaskCard(input(), "harian", "zz::code2region", SETTINGS.scope, 1)).toBeNull();
	});
	test("serials keep two re-asks of one card apart", () => {
		const first = reaskCard(
			input(justIntroduced),
			"harian",
			"bk::code2region",
			SETTINGS.scope,
			1
		);
		const second = reaskCard(
			input(justIntroduced),
			"harian",
			"bk::code2region",
			SETTINGS.scope,
			2
		);
		expect(first!.id).not.toBe(second!.id);
	});
});

describe("where a re-ask goes", () => {
	const fresh = reaskCard(
		input([intro("bk", NOW - 60_000)]),
		"harian",
		"bk::code2region",
		SETTINGS.scope,
		1
	)!;
	const asIntro = {
		...fresh,
		id: "bk::code2region#3",
		question: { ...fresh.question, context: "intro" as const }
	};
	const asReview = {
		...fresh,
		id: "bk::code2region#3",
		question: { ...fresh.question, context: "daily" as const }
	};

	test("an introduction comes back four cards later", () => {
		expect(reaskPosition(asIntro, 2, 20)).toBe(7);
	});
	test("a lapse comes back at the end", () => {
		expect(reaskPosition(asReview, 2, 20)).toBe(20);
	});
	test("an answer to a re-ask never adds another", () => {
		expect(reaskPosition(fresh, 2, 20)).toBeNull();
	});
});

describe("previews and empty screens after review", () => {
	test("the daily preview counts the re-ask every new code will get", () => {
		const plan = planSession("harian", input(), NO_PARAMS);
		if (plan.kind !== "ready") throw new Error("expected a plan");
		expect(plan.preview?.count).toBe(String(plan.cards.length * 2));
	});
	test("cek reopened after it was taken today says so", () => {
		const state = stateOf([
			intro("bk", NOW - 30 * DAY),
			review("bk", "code2region", NOW - 30 * DAY + 60_000),
			// NOW is the first minute of the local day, so the recheck is answered at NOW itself.
			review("bk", "code2region", NOW, { context: "recheck" })
		]);
		const plan = planSession("cek", { ...input(), state }, NO_PARAMS);
		expect(plan.kind).toBe("empty");
		if (plan.kind === "empty") {
			expect(plan.message).toBe("Cek ingatan hari ini sudah dikerjakan.");
			expect(plan.detail).toBe("Lanjutkan dengan sesi harian.");
		}
	});
	test("cek without a long break explains when it is offered", () => {
		const plan = planSession("cek", input(learned), NO_PARAMS);
		if (plan.kind !== "empty") throw new Error("expected an empty plan");
		expect(plan.message).toBe("Cek ingatan ditawarkan setelah libur panjang.");
	});
});
