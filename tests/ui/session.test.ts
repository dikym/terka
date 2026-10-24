import { expect, test } from "bun:test";
import { type Mode, modeFromParam, QUEUES } from "../../src/dummy/session";
import { initialSession, type SessionState, sessionReducer } from "../../src/dummy/session-reducer";

const started = (mode: Mode = "hariIni") => sessionReducer(initialSession(mode), { type: "start" });
const answer = (state: SessionState, value: string) =>
	sessionReducer(sessionReducer(state, { type: "input", value }), { type: "submit" });
const atTyped = (mode: Mode = "hariIni") => {
	let state = started(mode);
	while (QUEUES[mode][state.index].options)
		state = sessionReducer(
			sessionReducer(state, { type: "choose", option: QUEUES[mode][state.index].answer }),
			{ type: "next" }
		);
	return state;
};

test("mode comes from the query param", () => {
	expect(modeFromParam("kilat")).toBe("kilat");
	expect(modeFromParam("harian")).toBe("harian");
	expect(modeFromParam(null)).toBe("hariIni");
	expect(modeFromParam("nonsense")).toBe("hariIni");
});

test("answers match regardless of case and spacing", () => {
	const state = atTyped();
	const right = QUEUES.hariIni[state.index].answer;
	expect(answer(state, `  ${right.toUpperCase()} `).verdict).toBe("right");
	expect(answer(state, "Bukan ini").verdict).toBe("wrong");
});

test("an accepted alias counts as right", () => {
	const index = QUEUES.hariIni.findIndex((card) => card.aliases?.length);
	const state = { ...started(), index };
	expect(answer(state, QUEUES.hariIni[index].aliases![0]).verdict).toBe("right");
});

test("a blank answer is not submitted", () => {
	expect(answer(atTyped(), "   ").phase).toBe("ask");
});

test("undo returns to the question only while the answer is on screen", () => {
	const graded = answer(atTyped(), "Bukan ini");
	const undone = sessionReducer(graded, { type: "undo" });
	expect(undone.phase).toBe("ask");
	expect(undone.undone).toBe(true);
	expect(undone.input).toBe("");
	const moved = sessionReducer(graded, { type: "next" });
	expect(sessionReducer(moved, { type: "undo" })).toEqual(moved);
});

test("undo does nothing in mode kilat", () => {
	const chosen = sessionReducer(started("kilat"), { type: "choose", option: "Sumatera" });
	expect(sessionReducer(chosen, { type: "undo" })).toEqual(chosen);
});

test("a wrong answer on a hard code offers a note", () => {
	const index = QUEUES.hariIni.findIndex((card) => card.offerNote);
	const state = { ...started(), index };
	expect(answer(state, "Bukan ini").noteOffered).toBe(true);
	expect(answer(state, QUEUES.hariIni[index].answer).noteOffered).toBe(false);
});

test("lowering the level turns a typed card into a choice for that card only", () => {
	const index = QUEUES.hariIni.findIndex((card) => card.lowerable);
	const state = { ...started(), index };
	const lowered = sessionReducer(state, { type: "lowerLevel" });
	expect(lowered.lowered).toContain(QUEUES.hariIni[index].id);
	const restored = sessionReducer(lowered, { type: "restoreLevel" });
	expect(restored.lowered).not.toContain(QUEUES.hariIni[index].id);
});

test("running out of time grades the card wrong", () => {
	const timed = sessionReducer(atTyped(), { type: "timeout" });
	expect(timed.phase).toBe("graded");
	expect(timed.verdict).toBe("wrong");
	expect(timed.timedOut).toBe(true);
});

test("the queue ends in the summary", () => {
	let state = started("harian");
	for (const card of QUEUES.harian) {
		state = card.options
			? sessionReducer(state, { type: "choose", option: card.answer })
			: answer(state, card.answer);
		state = sessionReducer(state, { type: "next" });
	}
	expect(state.phase).toBe("done");
	expect(state.results.every((result) => result === "right")).toBe(true);
});

test("mode kilat keeps cycling cards until the clock stops", () => {
	let state = started("kilat");
	for (let i = 0; i < QUEUES.kilat.length + 2; i++)
		state = sessionReducer(sessionReducer(state, { type: "choose", option: "x" }), {
			type: "next"
		});
	expect(state.phase).toBe("ask");
	expect(sessionReducer(state, { type: "timeout" }).phase).toBe("done");
});

test("named areas are collected without duplicates", () => {
	let state = started("sebutkan");
	for (const name of ["Medan", " medan ", "Binjai", ""])
		state = sessionReducer(sessionReducer(state, { type: "input", value: name }), {
			type: "add"
		});
	expect(state.named).toEqual(["Medan", "Binjai"]);
	state = sessionReducer(state, { type: "remove", value: "Medan" });
	expect(state.named).toEqual(["Binjai"]);
});

test("a naming round finishes only once something was named", () => {
	const empty = sessionReducer(started("sebutkan"), { type: "submit" });
	expect(empty.phase).toBe("ask");
	const named = sessionReducer(
		sessionReducer(sessionReducer(started("sebutkan"), { type: "input", value: "Medan" }), {
			type: "add"
		}),
		{ type: "submit" }
	);
	expect(named.phase).toBe("graded");
});

test("an object key in the query param is not a mode", () => {
	expect(modeFromParam("constructor")).toBe("hariIni");
	expect(modeFromParam("toString")).toBe("hariIni");
});

test("the level comes back only while the question is open", () => {
	const index = QUEUES.hariIni.findIndex((card) => card.lowerable);
	const lowered = sessionReducer({ ...started(), index }, { type: "lowerLevel" });
	const graded = sessionReducer(lowered, {
		type: "choose",
		option: QUEUES.hariIni[index].answer
	});
	expect(sessionReducer(graded, { type: "restoreLevel" })).toEqual(graded);
});

test("finishing a naming round keeps text typed but not yet added", () => {
	const typed = sessionReducer(started("sebutkan"), { type: "input", value: "Medan" });
	const finished = sessionReducer(typed, { type: "submit" });
	expect(finished.phase).toBe("graded");
	expect(finished.named).toEqual(["Medan"]);
});
