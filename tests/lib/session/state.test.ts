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
