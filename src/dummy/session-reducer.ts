import { normalizeName } from "@/core/text";
import { type DummyCard, type Level, type Mode, QUEUES } from "./session";

export type Verdict = "right" | "wrong";

export type SessionState = {
	mode: Mode;
	phase: "preview" | "ask" | "graded" | "done";
	index: number;
	input: string;
	chosen: string | null;
	verdict: Verdict | null;
	timedOut: boolean;
	/** The last answer was taken back; the question shows a notice until the next answer. */
	undone: boolean;
	noteOffered: boolean;
	/** Ids of cards whose level was lowered to 1 for this session. */
	lowered: string[];
	/** Areas named so far on a Sebutkan card. */
	named: string[];
	results: Verdict[];
};

export type SessionAction =
	| { type: "start" }
	| { type: "input"; value: string }
	| { type: "submit" }
	| { type: "choose"; option: string }
	| { type: "next" }
	| { type: "undo" }
	| { type: "timeout" }
	| { type: "lowerLevel" }
	| { type: "restoreLevel" }
	| { type: "dismissNote" }
	| { type: "add" }
	| { type: "remove"; value: string };

export const initialSession = (mode: Mode): SessionState => ({
	mode,
	phase: "preview",
	index: 0,
	input: "",
	chosen: null,
	verdict: null,
	timedOut: false,
	undone: false,
	noteOffered: false,
	lowered: [],
	named: [],
	results: []
});

export const currentCard = (state: SessionState): DummyCard => QUEUES[state.mode][state.index];

export const cardLevel = (state: SessionState, card = currentCard(state)): Level =>
	state.lowered.includes(card.id) ? 1 : card.level;

/** The choices on screen, or null for a typed answer. */
export const cardOptions = (state: SessionState, card = currentCard(state)) =>
	card.options ?? (state.lowered.includes(card.id) ? (card.lowerOptions ?? null) : null);

const matches = (card: DummyCard, value: string) => {
	const given = normalizeName(value);
	return [card.answer, ...(card.aliases ?? [])].some(
		(accepted) => normalizeName(accepted) === given
	);
};

function grade(
	state: SessionState,
	verdict: Verdict,
	extra: Partial<SessionState> = {}
): SessionState {
	const card = currentCard(state);
	return {
		...state,
		...extra,
		phase: "graded",
		verdict,
		undone: false,
		noteOffered: verdict === "wrong" && !!card.offerNote,
		results: [...state.results, verdict]
	};
}

function advance(state: SessionState): SessionState {
	const queue = QUEUES[state.mode];
	const last = state.index >= queue.length - 1;
	// Mode Kilat runs on a clock, not on a queue: it loops until time is up.
	if (last && state.mode !== "kilat") return { ...state, phase: "done" };
	return {
		...state,
		phase: "ask",
		index: last ? 0 : state.index + 1,
		input: "",
		chosen: null,
		verdict: null,
		timedOut: false,
		noteOffered: false
	};
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
	switch (action.type) {
		case "start":
			return state.phase === "preview" ? { ...state, phase: "ask" } : state;
		case "input":
			return state.phase === "ask" ? { ...state, input: action.value } : state;
		case "submit": {
			if (state.phase !== "ask" || cardOptions(state)) return state;
			const card = currentCard(state);
			if (card.form === "sebutkan") {
				const withTyped = sessionReducer(state, { type: "add" });
				return withTyped.named.length ? grade(withTyped, "right") : withTyped;
			}
			if (!state.input.trim()) return state;
			return grade(state, matches(card, state.input) ? "right" : "wrong");
		}
		case "choose": {
			if (state.phase !== "ask" || !cardOptions(state)) return state;
			const verdict = action.option === currentCard(state).answer ? "right" : "wrong";
			return grade(state, verdict, { chosen: action.option });
		}
		case "next":
			return state.phase === "graded" ? advance(state) : state;
		case "undo":
			if (state.phase !== "graded" || state.mode === "kilat") return state;
			return {
				...state,
				phase: "ask",
				input: "",
				chosen: null,
				verdict: null,
				timedOut: false,
				noteOffered: false,
				undone: true,
				results: state.results.slice(0, -1)
			};
		case "timeout":
			if (state.mode === "kilat") return { ...state, phase: "done" };
			return state.phase === "ask" ? grade(state, "wrong", { timedOut: true }) : state;
		case "lowerLevel": {
			const card = currentCard(state);
			if (state.phase !== "ask" || !card.lowerable || state.lowered.includes(card.id))
				return state;
			return { ...state, lowered: [...state.lowered, card.id] };
		}
		case "restoreLevel": {
			if (state.phase !== "ask") return state;
			const card = currentCard(state);
			return { ...state, lowered: state.lowered.filter((id) => id !== card.id) };
		}
		case "dismissNote":
			return { ...state, noteOffered: false };
		case "add": {
			const value = state.input.trim();
			const known = state.named.some((name) => normalizeName(name) === normalizeName(value));
			if (state.phase !== "ask" || !value || known) return { ...state, input: "" };
			return { ...state, input: "", named: [...state.named, value] };
		}
		case "remove":
			return { ...state, named: state.named.filter((name) => name !== action.value) };
	}
}
