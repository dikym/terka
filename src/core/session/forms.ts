import type { QuestionContext, QuestionFormat } from "../questions/question";
import { seeded } from "../random";

const REGION_FORMS: readonly QuestionFormat[] = ["choice", "truefalse", "oddoneout"];

// Only Tebak daerah has true/false and odd-one-out variants; the builder falls back when choices run short.
export function pickFormat(cardId: string, seed: string, context: QuestionContext): QuestionFormat {
	if (context === "intro" || !cardId.endsWith("::code2region")) return "choice";
	return REGION_FORMS[Math.floor(seeded(`${seed}:format`)() * REGION_FORMS.length)];
}
