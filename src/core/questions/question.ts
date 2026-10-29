import type { AnswerSignals } from "../grading/signals";
import { seeded } from "../random";
import type { RungMemory } from "./rung";
import type { Scope } from "./distractors";

export type CardMode =
	"code2region" | "region2code" | "setrecall" | "special2holder" | "holder2special";
export type Level = 1 | 2 | 3;
export type LevelSource = "auto" | "manual_up" | "manual_down";
export type QuestionContext = AnswerSignals["context"];
export type QuestionFormat = "choice" | "truefalse" | "oddoneout";

export type QuestionAnswer =
	| { kind: "area"; codeId: string }
	| { kind: "region-code"; areaId: string; codeIds: string[] }
	| { kind: "holder"; specialId: string }
	| { kind: "special-code"; specialId: string }
	| { kind: "set"; codeId: string }
	| { kind: "literal"; value: string; confusedWith: string | null };

export type Question = {
	cardId: string;
	context: QuestionContext;
	level: Level;
	autoLevel: Level;
	levelSource: LevelSource;
	questionType: AnswerSignals["questionType"];
	answerForm: AnswerSignals["answerForm"];
	label: string;
	prompt: string;
	choices: string[];
	answer: QuestionAnswer;
	promptAreaId: string | null;
	limit: { ms: number; until: "first-input" | "answer" } | null;
	setThreshold: number | null;
	drillPairWith: string | null;
	reveal: { lines: string[]; note: string | null } | null;
	assisted: boolean;
	// Bandingkan Kode only: shown with the result, since before answering it would give the answer away.
	hint?: CompareHint;
};

export type CompareHint = {
	a: { code: string; place: string };
	b: { code: string; place: string };
};

export type QuestionOptions = {
	context: QuestionContext;
	level?: Level;
	scope?: Scope;
	format?: QuestionFormat;
	drillPair?: string;
	note?: string | null;
	previousPromptAreaId?: string | null;
	// A re-ask of a card keeps its prompt but draws its own options and their order.
	variant?: number;
	// Practice that does not move the schedule never raises `reps`; a salt per run keeps it from repeating.
	salt?: string;
	memory?: RungMemory;
};

const VARIED_PURPOSES = new Set(["distractors", "order"]);

export function questionRandom(
	card: { cardId: string; reps: number },
	options: Pick<QuestionOptions, "variant" | "salt">,
	purpose: string
) {
	const variant = options.variant && VARIED_PURPOSES.has(purpose) ? `:${options.variant}` : "";
	const salt = options.salt ? `:${options.salt}` : "";
	return seeded(`${card.cardId}:${card.reps}:${purpose}${variant}${salt}`);
}

export const LABELS = {
	guessArea: "Tebak daerah",
	guessCode: "Tebak kode",
	timed: "Tebak berwaktu",
	set: "Sebutkan sebanyak mungkin",
	trueFalse: "Benar atau salah",
	oddOneOut: "Mana yang bukan",
	compare: "Bandingkan Kode",
	diplomat: "Tebak diplomat",
	intro: "Materi baru"
} as const;

const MODES: CardMode[] = [
	"code2region",
	"region2code",
	"setrecall",
	"special2holder",
	"holder2special"
];

export function parseCardId(cardId: string): { contentId: string; mode: CardMode } {
	const [contentId, mode, extra] = cardId.split("::");
	if (!contentId || extra !== undefined || !MODES.includes(mode as CardMode))
		throw new Error(`invalid card id ${cardId}`);
	return { contentId, mode: mode as CardMode };
}
