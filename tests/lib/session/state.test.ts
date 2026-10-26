import { describe, expect, test } from "bun:test";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { buildQuestion } from "../../../src/core/questions/build";
import { type CardEntry, newEntry } from "../../../src/core/replay/state";
import { toCard } from "../../../src/lib/session/cards";
import type { Mode } from "../../../src/lib/session/modes";
import {
	activeQuestion,
	cardOptions,
	initialSession,
	type SessionState,
	sessionReducer,
	sessionTotal,
	submittable
} from "../../../src/lib/session/state";
import { ruleBundle } from "../../core/replay/fixtures";

const bundle = ruleBundle();
const dictionary = buildDictionary(bundle);
const typed = (cardId: string): CardEntry => ({
	...newEntry(cardId),
	state: "review",
	intervalDays: 5,
	reps: 3
});
const cardsFor = (mode: Mode, ids = ["bk::code2region", "ba::code2region"]) =>
	ids.map((cardId) => {
		const entry = typed(cardId);
		const context = mode === "kilat" ? "kilat" : "daily";
		return toCard(
			buildQuestion(entry, bundle, { context }),
			{ cardId, context, slot: "review" },
			entry,
			{
				bundle,
				dictionary,
				notes: new Map(),
				mode,
				counts: false
			}
		);
	});
const started = (mode: Mode = "hariIni") =>
	sessionReducer(initialSession(mode, cardsFor(mode)), { type: "start" });
const graded = (state: SessionState, verdict: "right" | "wrong" | "unverified") =>
	sessionReducer(state, {
		type: "grade",
		verdict,
		timedOut: false,
		chosen: null,
		noteOffered: false
	});

describe("session state", () => {
	test("a blank typed answer cannot be submitted", () => {
		const state = sessionReducer(started(), { type: "input", value: "   " });
		expect(submittable(state)).toBe(false);
		expect(submittable(sessionReducer(state, { type: "input", value: "Medan" }))).toBe(true);
	});

	test("an unverified answer is recorded as neither right nor wrong", () => {
		const state = graded(started(), "unverified");
		expect(state.phase).toBe("graded");
		expect(state.results).toEqual(["unverified"]);
	});

	test("undo returns to the question only while its result is on screen", () => {
		const state = graded(started(), "wrong");
		const undone = sessionReducer(state, { type: "undo" });
		expect(undone.phase).toBe("ask");
		expect(undone.undone).toBe(true);
		expect(undone.results).toEqual([]);
		const moved = sessionReducer(state, { type: "next" });
		expect(sessionReducer(moved, { type: "undo" })).toBe(moved);
	});

	test("mode kilat never undoes", () => {
		const state = graded(started("kilat"), "right");
		expect(sessionReducer(state, { type: "undo" })).toBe(state);
	});

	test("the last answer ends the session, except in mode kilat", () => {
		const second = sessionReducer(graded(started(), "right"), { type: "next" });
		expect(sessionReducer(graded(second, "right"), { type: "next" }).phase).toBe("done");
		const kilat = sessionReducer(graded(started("kilat"), "right"), { type: "next" });
		expect(sessionReducer(graded(kilat, "right"), { type: "next" }).phase).toBe("graded");
	});

	test("a lowered card asks its level 1 choices", () => {
		const state = sessionReducer(started(), { type: "lowerLevel" });
		const card = state.cards[0];
		expect(cardOptions(state, card)).toEqual(card.lowered!.choices);
		expect(activeQuestion(state, card)).toBe(card.lowered!);
		expect(cardOptions(sessionReducer(state, { type: "restoreLevel" }), card)).toBeNull();
	});

	test("names on a naming card are added once each", () => {
		let state = sessionReducer(started(), { type: "input", value: "Medan" });
		state = sessionReducer(state, { type: "add" });
		state = sessionReducer(sessionReducer(state, { type: "input", value: " medan " }), {
			type: "add"
		});
		expect(state.named).toEqual(["Medan"]);
		expect(state.input).toBe("");
	});
});

describe("re-asks inside a session", () => {
	const five = ["bk", "ba", "bb", "bm", "bp"].map((code) => `${code}::code2region`);
	const extra = () => cardsFor("hariIni", ["be::code2region"])[0];
	const begun = () =>
		sessionReducer(initialSession("hariIni", cardsFor("hariIni", five)), { type: "start" });

	test("insert places a card after the given number of later cards", () => {
		const card = extra();
		const state = sessionReducer(begun(), { type: "insert", card, at: 3 });
		expect(state.cards.map((item) => item.id).indexOf(card.id)).toBe(3);
		expect(state.cards).toHaveLength(6);
	});
	test("insert past the end appends", () => {
		const card = extra();
		const state = sessionReducer(begun(), { type: "insert", card, at: 99 });
		expect(state.cards.at(-1)).toBe(card);
	});
	test("insert never lands on or before the card on screen", () => {
		const card = extra();
		const state = sessionReducer(begun(), { type: "insert", card, at: 0 });
		expect(state.cards[1]).toBe(card);
		expect(state.index).toBe(0);
	});
	test("drop removes a card that is still ahead", () => {
		const card = extra();
		const inserted = sessionReducer(begun(), { type: "insert", card, at: 3 });
		const dropped = sessionReducer(inserted, { type: "drop", id: card.id });
		expect(dropped.cards).toHaveLength(5);
		expect(dropped.cards.some((item) => item.id === card.id)).toBe(false);
	});
	test("drop never removes the card on screen or one already answered", () => {
		const state = begun();
		const onScreen = state.cards[0].id;
		expect(sessionReducer(state, { type: "drop", id: onScreen })).toBe(state);
		const moved = sessionReducer(graded(state, "right"), { type: "next" });
		expect(sessionReducer(moved, { type: "drop", id: onScreen })).toBe(moved);
	});
});

describe("re-asks at the edges", () => {
	const two = ["bk::code2region", "ba::code2region"];
	const extra = () => cardsFor("hariIni", ["be::code2region"])[0];

	test("a re-ask added after the last answer keeps the session going", () => {
		const onLast = sessionReducer(graded(started(), "right"), { type: "next" });
		const last = sessionReducer(graded(onLast, "right"), {
			type: "insert",
			card: extra(),
			at: 99
		});
		expect(last.index).toBe(1);
		const moved = sessionReducer(last, { type: "next" });
		expect(moved.phase).toBe("ask");
		expect(moved.cards[moved.index].id).toBe(extra().id);
	});
	test("without a re-ask the last answer ends the session", () => {
		const onLast = sessionReducer(graded(started(), "right"), { type: "next" });
		expect(sessionReducer(graded(onLast, "right"), { type: "next" }).phase).toBe("done");
	});
	test("dropping an unknown card changes nothing", () => {
		const state = sessionReducer(initialSession("hariIni", cardsFor("hariIni", two)), {
			type: "start"
		});
		expect(sessionReducer(state, { type: "drop", id: "nope" })).toBe(state);
	});
	test("two re-asks keep the order they were added in", () => {
		const first = cardsFor("hariIni", ["be::code2region"])[0];
		const second = cardsFor("hariIni", ["bd::code2region"])[0];
		let state = sessionReducer(initialSession("hariIni", cardsFor("hariIni", two)), {
			type: "start"
		});
		state = sessionReducer(state, { type: "insert", card: first, at: 99 });
		state = sessionReducer(state, { type: "insert", card: second, at: 99 });
		expect(state.cards.slice(-2).map((card) => card.id)).toEqual([first.id, second.id]);
	});
});

describe("the session total", () => {
	const introCard = (code: string) => {
		const entry = newEntry(`${code}::code2region`);
		return toCard(
			buildQuestion(entry, bundle, { context: "intro" }),
			{ cardId: entry.cardId, context: "intro", slot: "new" },
			entry,
			{ bundle, dictionary, notes: new Map(), mode: "hariIni", counts: false }
		);
	};
	const reaskOf = (code: string) => ({
		...cardsFor("hariIni", [`${code}::code2region`])[0],
		id: `${code}::code2region#r1`
	});

	test("counts the re-ask of every introduction from the start", () => {
		const state = initialSession("hariIni", [
			introCard("bk"),
			introCard("ba"),
			...cardsFor("hariIni", ["bb::code2region"])
		]);
		expect(sessionTotal(state)).toBe(5);
	});
	test("stays the same once a re-ask is in the session", () => {
		const start = sessionReducer(
			initialSession("hariIni", [introCard("bk"), introCard("ba")]),
			{
				type: "start"
			}
		);
		const before = sessionTotal(start);
		const answered = sessionReducer(graded(start, "right"), {
			type: "insert",
			card: reaskOf("bk"),
			at: 99
		});
		expect(sessionTotal(answered)).toBe(before);
	});
	test("a session without introductions counts its cards", () => {
		expect(sessionTotal(initialSession("hariIni", cardsFor("hariIni")))).toBe(2);
	});
});
