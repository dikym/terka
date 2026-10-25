import type { MatchType } from "../answers/match-name";

export type AnswerSignals = {
	context:
		| "intro"
		| "daily"
		| "drill"
		| "focused"
		| "challenge"
		| "kilat"
		| "placement"
		| "setrecall"
		| "special"
		| "recheck";
	level: 1 | 2 | 3;
	levelSource: "auto" | "manual_up" | "manual_down";
	questionType: "intro_read" | "choice" | "truefalse" | "oddoneout" | "typed" | "setrecall";
	answerForm: "choice" | "code" | "name";
	inputMode: "keyboard" | "touch";
	correct: boolean | null;
	timedOut: boolean;
	interrupted: boolean;
	matchType: MatchType;
	typoCost: number;
	msToFirstKey: number | null;
	msTotal: number;
	msTyping: number | null;
	keyGapsMs: number[] | null;
	deletedChars: number;
	optionChanges: number;
	answerLength: number;
	assisted: boolean;
	setCorrect: number | null;
	setThreshold: number | null;
};

export type Grade = 1 | 2 | 3 | 4;
