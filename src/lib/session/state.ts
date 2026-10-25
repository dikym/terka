import { normalizeName } from "@/core/text";
import type { Question } from "@/core/questions/question";
import type { Level, SessionCard } from "./cards";
import type { Mode } from "./modes";

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
	/** Ids of cards whose level was lowered to 1 for this session. */
	lowered: string[];
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
	| { type: "lowerLevel" }
	| { type: "restoreLevel" }
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
	lowered: [],
	named: [],
	results: [],
	feedback: {}
});

export const currentCard = (state: SessionState): SessionCard => state.cards[state.index];

const isLowered = (state: SessionState, card: SessionCard) => state.lowered.includes(card.id);

export const cardLevel = (state: SessionState, card = currentCard(state)): Level =>
	isLowered(state, card) ? 1 : card.level;

/** The question really on screen: the lowered one while the level is lowered. */
export const activeQuestion = (state: SessionState, card = currentCard(state)): Question =>
	isLowered(state, card) && card.lowered ? card.lowered : card.question;

/** The choices on screen, or null for a typed answer. */
export const cardOptions = (state: SessionState, card = currentCard(state)) =>
	isLowered(state, card) ? (card.lowered?.choices ?? null) : (card.options ?? null);

export const cardAnswer = (state: SessionState, card = currentCard(state)) =>
	isLowered(state, card) ? (card.loweredAnswer ?? card.answer) : card.answer;

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
		case "lowerLevel": {
			const card = currentCard(state);
			if (state.phase !== "ask" || !card.lowerable || isLowered(state, card)) return state;
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
