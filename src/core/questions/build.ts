import type { Bundle } from "@/core/content/schema";
import type { CardMemory } from "@/core/scheduling/card-memory";
import { automaticLevel, resolveLevel } from "@/core/questions/level";
import { parseCardId, type Question, type QuestionOptions } from "@/core/questions/question";
import { buildRegionQuestion } from "@/core/questions/region";
import { baseRung, NEUTRAL_MEMORY, rungForLevel } from "@/core/questions/rung";
import { buildSpecialQuestion } from "@/core/questions/special";

// Deterministic for a given card id, reps and options.
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
		: buildRegionQuestion(
				card,
				mode,
				bundle,
				levels,
				options,
				rungForLevel(
					baseRung(card, options.context, options.memory ?? NEUTRAL_MEMORY),
					levels.level,
					levels.levelSource
				)
			);
}
