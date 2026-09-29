import type { Bundle } from "../content/schema";
import type { CardMemory } from "../scheduling/card-memory";
import { automaticLevel, resolveLevel } from "./level";
import { parseCardId, type Question, type QuestionOptions } from "./question";
import { buildRegionQuestion } from "./region";
import { buildSpecialQuestion } from "./special";

// One entry point for every card; deterministic for a given card id, reps and options.
export function buildQuestion(
	card: CardMemory,
	bundle: Bundle,
	options: QuestionOptions
): Question {
	const { mode } = parseCardId(card.cardId);
	const autoLevel = automaticLevel(card, mode, options.context);
	const levels = { autoLevel, ...resolveLevel(autoLevel, options.level, options.context) };
	return mode === "special2holder" || mode === "holder2special"
		? buildSpecialQuestion(card, mode, bundle, levels, options)
		: buildRegionQuestion(card, mode, bundle, levels, options);
}
