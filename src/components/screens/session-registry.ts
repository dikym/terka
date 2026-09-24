import { AnswerUndoneScreen } from "./answer-undone";
import { BlindRecallScreen } from "./blind-recall";
import { CompareScreen } from "./compare";
import { CompareAnsweredScreen } from "./compare-answered";
import { FaktaKode } from "./fakta-kode";
import { KodeBelakang } from "./kode-belakang";
import { OddOneOutScreen } from "./odd-one-out";
import { PlatUtuh } from "./plat-utuh";
import { SessionGradedScreen } from "./session-graded";
import { SessionQuestionScreen } from "./session-question";
import { SessionSummaryScreen } from "./session-summary";
import { SetRecallScreen } from "./set-recall";
import { TrueFalseScreen } from "./true-false";

export const sessionScreens = {
	question: SessionQuestionScreen,
	graded: SessionGradedScreen,
	compare: CompareScreen,
	"compare-answered": CompareAnsweredScreen,
	summary: SessionSummaryScreen,
	"blind-recall": BlindRecallScreen,
	"set-recall": SetRecallScreen,
	"plat-utuh": PlatUtuh,
	"kode-belakang": KodeBelakang,
	"true-false": TrueFalseScreen,
	"odd-one-out": OddOneOutScreen,
	"fakta-kode": FaktaKode,
	undone: AnswerUndoneScreen
} satisfies Record<string, () => React.JSX.Element>;

export type SessionScreenKey = keyof typeof sessionScreens;
