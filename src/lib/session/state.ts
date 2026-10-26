import { normalizeName } from "@/core/text";
import type { SessionCard } from "./cards";
import { type Mode, REASK_MARK } from "./modes";

export type Verdict = "right" | "wrong" | "unverified";

export type SessionState = {
	mode: Mode;
	phase: "preview" | "ask" | "graded" | "done";
	index: number;
	cards: SessionCard[];
	input: string;
	chosen: string | null;
	verdict: Verdict | null;
	timedOut: boolean;
	/** The last answer was taken back; the question shows a notice until the next answer. */
	undone: boolean;
	noteOffered: boolean;
	/** Areas named so far on a Sebutkan card. */
	named: string[];
	results: Verdict[];
	/** Shown under a right answer: accepted spelling, other areas, the next review. */
	feedback: { aliasNote?: string; review?: string };
};

export type SessionAction =
	| { type: "start" }
	| { type: "input"; value: string }
	| {
			type: "grade";
			verdict: Verdict;
			timedOut: boolean;
			chosen: string | null;
			noteOffered: boolean;
			aliasNote?: string;
	  }
	| { type: "review"; text: string }
	| { type: "next" }
	| { type: "undo" }
	| { type: "dismissNote" }
	| { type: "add" }
	| { type: "remove"; value: string }
	| { type: "append"; cards: SessionCard[] }
	| { type: "insert"; card: SessionCard; at: number }
	| { type: "drop"; id: string }
	| { type: "finish" };

export const initialSession = (mode: Mode, cards: SessionCard[]): SessionState => ({
	mode,
	phase: "preview",
	index: 0,
	cards,
	input: "",
	chosen: null,
	verdict: null,
	timedOut: false,
	undone: false,
	noteOffered: false,
	named: [],
	results: [],
	feedback: {}
});

export const currentCard = (state: SessionState): SessionCard => state.cards[state.index];

// Every introduction comes back once, so its re-ask counts from the start and the bar never steps back.
export function sessionTotal(state: SessionState): number {
	const reasked = new Set(
		state.cards
			.filter((card) => card.id.includes(REASK_MARK))
			.map((card) => card.question.cardId)
	);
	const pending = state.cards.filter(
		(card) => card.question.context === "intro" && !reasked.has(card.question.cardId)
	).length;
	return state.cards.length + pending;
}

/** A typed answer needs text; a naming card needs at least one name. */
export function submittable(state: SessionState): boolean {
	if (state.phase !== "ask") return false;
	const card = currentCard(state);
	if (card.form === "sebutkan") return state.named.length > 0 || state.input.trim() !== "";
	return state.input.trim() !== "";
}

function advance(state: SessionState): SessionState {
	const last = state.index >= state.cards.length - 1;
	if (last) return state.mode === "kilat" ? state : { ...state, phase: "done" };
	return {
		...state,
		phase: "ask",
		index: state.index + 1,
		input: "",
		chosen: null,
		verdict: null,
		timedOut: false,
		noteOffered: false,
		named: [],
		feedback: {}
	};
}

const known = (names: string[], value: string) =>
	names.some((name) => normalizeName(name) === normalizeName(value));

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
	switch (action.type) {
		case "start":
			return state.phase === "preview" && state.cards.length
				? { ...state, phase: "ask" }
				: state;
		case "input":
			return state.phase === "ask" ? { ...state, input: action.value } : state;
		case "grade":
			if (state.phase !== "ask") return state;
			return {
				...state,
				phase: "graded",
				verdict: action.verdict,
				timedOut: action.timedOut,
				chosen: action.chosen,
				undone: false,
				noteOffered: action.noteOffered,
				results: [...state.results, action.verdict],
				feedback: action.aliasNote ? { aliasNote: action.aliasNote } : {}
			};
		case "review":
			return state.phase === "graded"
				? { ...state, feedback: { ...state.feedback, review: action.text } }
				: state;
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
				named: [],
				undone: true,
				feedback: {},
				results: state.results.slice(0, -1)
			};
		case "dismissNote":
			return { ...state, noteOffered: false };
		case "add": {
			const value = state.input.trim();
			if (state.phase !== "ask" || !value || known(state.named, value))
				return { ...state, input: "" };
			return { ...state, input: "", named: [...state.named, value] };
		}
		case "remove":
			return { ...state, named: state.named.filter((name) => name !== action.value) };
		case "append":
			return { ...state, cards: [...state.cards, ...action.cards] };
		case "insert": {
			const at = Math.min(Math.max(action.at, state.index + 1), state.cards.length);
			return {
				...state,
				cards: [...state.cards.slice(0, at), action.card, ...state.cards.slice(at)]
			};
		}
		case "drop": {
			const at = state.cards.findIndex((card) => card.id === action.id);
			return at > state.index
				? { ...state, cards: state.cards.filter((_, index) => index !== at) }
				: state;
		}
		case "finish":
			return state.phase === "done" ? state : { ...state, phase: "done" };
	}
}
