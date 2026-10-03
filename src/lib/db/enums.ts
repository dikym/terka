import type { MatchType } from "@/core/answers/match-name";
import type { CardEvent, FsrsParams, ReviewLog, RunKind } from "@/core/log/events";
import type { Scope } from "@/core/questions/distractors";
import type { CardMode, LevelSource, QuestionContext } from "@/core/questions/question";
import type { Tier } from "@/rules";

// The client's single list of every enum the database checks. Records, so the compiler rejects a
// missing or unknown value; a test compares them with the database constraints.
export const CARD_MODES: Record<CardMode, true> = {
	code2region: true,
	region2code: true,
	setrecall: true,
	special2holder: true,
	holder2special: true
};
export const SCOPE_LEVELS: Record<Scope["level"], true> = {
	national: true,
	group: true,
	province: true
};
export const CONTEXTS: Record<QuestionContext, true> = {
	intro: true,
	daily: true,
	drill: true,
	focused: true,
	challenge: true,
	kilat: true,
	placement: true,
	setrecall: true,
	special: true
};
export const LEVEL_SOURCES: Record<LevelSource, true> = {
	auto: true,
	manual_up: true,
	manual_down: true
};
export const INPUT_MODES: Record<ReviewLog["inputMode"], true> = { keyboard: true, touch: true };
export const MATCH_TYPES: Record<MatchType, true> = {
	exact: true,
	variant: true,
	typo: true,
	unverified: true,
	none: true
};
export const QUESTION_TYPES: Record<ReviewLog["questionType"], true> = {
	intro_read: true,
	choice: true,
	truefalse: true,
	oddoneout: true,
	typed: true,
	setrecall: true
};
export const CARD_EVENT_KINDS: Record<CardEvent["kind"], true> = { suspend: true, unsuspend: true };
export const FSRS_ALGORITHMS: Record<FsrsParams["algorithm"], true> = { "fsrs-6": true };
export const FSRS_STATUSES: Record<FsrsParams["status"], true> = { active: true, rejected: true };
export const RUN_KINDS: Record<RunKind, true> = {
	daily: true,
	focused: true,
	challenge: true,
	kilat: true,
	placement: true,
	setrecall: true,
	special: true
};
export const TIERS: Record<Tier, true> = { pemula: true, menengah: true, mahir: true, ahli: true };
