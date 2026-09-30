import type { Tier } from "../../rules";
import type { MatchType } from "../answers/match-name";
import type { SetItem } from "../answers/match-set";
import type { AnswerSignals } from "../grading/signals";
import type { CardMode, Level, LevelSource, QuestionContext } from "../questions/question";

// Times are epoch milliseconds; `receivedAt` and `serverSeq` stay null until the server has the row.
type EventRow = {
	id: string;
	deviceId: string;
	receivedAt: number | null;
	serverSeq: number | null;
};

export type ReviewLog = EventRow & {
	runId: string | null;
	contentId: string;
	mode: CardMode;
	context: QuestionContext;
	level: Level;
	levelSource: LevelSource;
	correct: boolean | null;
	timedOut: boolean;
	msToFirstKey: number | null;
	msTotal: number;
	msTyping: number | null;
	keyGapsMs: number[] | null;
	deletedChars: number;
	optionChanges: number;
	optionCount: number | null;
	inputMode: "keyboard" | "touch";
	interrupted: boolean;
	rawAnswer: string | null;
	matchType: MatchType;
	typoCost: number;
	acceptedAreaId: string | null;
	promptAreaId: string | null;
	answerRulesVersion: number;
	unknown: boolean;
	confusedWith: string | null;
	drillPairWith: string | null;
	setCorrect: number | null;
	setThreshold: number | null;
	setItems: SetItem[] | null;
	questionType: AnswerSignals["questionType"];
	contentVersion: number;
	engineVersion: number;
	clientTs: number;
	localDay: string;
	tz: string;
};

export type ReviewVoid = EventRow & { reviewId: string; clientTs: number };

export type CardEvent = EventRow & {
	contentId: string;
	mode: CardMode;
	kind: "suspend" | "unsuspend";
	clientTs: number;
	localDay: string;
};

export type Sighting = EventRow & { regionId: string; clientTs: number; localDay: string };

export type FactView = EventRow & {
	factId: string;
	runId: string | null;
	clientTs: number;
	localDay: string;
};

export type FsrsParams = EventRow & {
	algorithm: "fsrs-6";
	libraryVersion: string;
	weights: number[];
	status: "active" | "rejected";
	activatedAt: number | null;
	trainedReviewCount: number;
	trainedThroughSeq: number | null;
	trainingSetHash: string;
	createdAt: number;
	logloss: number;
	rmse: number;
	baselineLogloss: number;
	baselineRmse: number;
	trainingEventIds?: string[];
};

export type RunKind =
	"daily" | "focused" | "challenge" | "kilat" | "placement" | "setrecall" | "special";

export type PracticeRun = EventRow & {
	kind: RunKind;
	scopeLevel: "national" | "group" | "province";
	scopeId: string | null;
	startedAt: number;
	localDay: string;
	endedAt: number | null;
	answered: number | null;
	correct: number | null;
	activeMs: number | null;
	score: number | null;
	estimatedMs: number | null;
	plannedCount: number | null;
	placementLevel: Tier | null;
};

export type LearningEvent =
	| { table: "review_logs"; row: ReviewLog }
	| { table: "review_voids"; row: ReviewVoid }
	| { table: "card_events"; row: CardEvent }
	| { table: "sightings"; row: Sighting }
	| { table: "fact_views"; row: FactView }
	| { table: "fsrs_params"; row: FsrsParams }
	| { table: "practice_runs"; row: PracticeRun };
