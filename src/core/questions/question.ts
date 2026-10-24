import type { AnswerSignals } from "../grading/signals";
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
};

export const LABELS = {
	guessArea: "Tebak daerah",
	guessCode: "Tebak kode",
	timed: "Tebak berwaktu",
	set: "Sebutkan sebanyak mungkin",
	trueFalse: "Benar atau salah",
	oddOneOut: "Mana yang bukan",
	compare: "Bandingkan Kode",
	diplomat: "Tebak diplomat",
	intro: "Materi baru · tebak dulu"
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
