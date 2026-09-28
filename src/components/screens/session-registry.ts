import { AnswerUndoneScreen } from "./answer-undone";
import { CompareScreen } from "./compare";
import { CompareAnsweredScreen } from "./compare-answered";
import { OddOneOutScreen } from "./odd-one-out";
import { SessionGradedScreen } from "./session-graded";
import { SessionQuestionScreen } from "./session-question";
import { SessionSummaryScreen } from "./session-summary";
import { SetRecallScreen } from "./set-recall";
import { TimedGuessScreen } from "./timed-guess";
import { TrueFalseScreen } from "./true-false";

export const sessionScreens = {
	question: SessionQuestionScreen,
	graded: SessionGradedScreen,
	compare: CompareScreen,
	"compare-answered": CompareAnsweredScreen,
	summary: SessionSummaryScreen,
	"timed-guess": TimedGuessScreen,
	"set-recall": SetRecallScreen,
	"true-false": TrueFalseScreen,
	"odd-one-out": OddOneOutScreen,
	undone: AnswerUndoneScreen
} satisfies Record<string, () => React.JSX.Element>;

export type SessionScreenKey = keyof typeof sessionScreens;
