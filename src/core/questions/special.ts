import type { Bundle, Special } from "../content/schema";
import { seeded, shuffle } from "../random";
import { isLeech } from "../scheduling/card";
import type { CardMemory } from "../scheduling/card-memory";
import { specialChoices } from "./distractors";
import {
	LABELS,
	parseCardId,
	type Level,
	type LevelSource,
	type Question,
	type QuestionOptions
} from "./question";
import { levelSourceFor, type ResolvedLevels } from "./region";

const TIMED_MS = 8_000;

export function buildSpecialQuestion(
	card: CardMemory,
	mode: "special2holder" | "holder2special",
	bundle: Bundle,
	levels: ResolvedLevels,
	options: QuestionOptions
): Question {
	const id = parseCardId(card.cardId).contentId;
	const special: Special | undefined = bundle.specials.find((entry) => entry.id === id);
	if (!special) throw new Error(`unknown special ${id}`);
	const random = (purpose: string) => seeded(`${card.cardId}:${card.reps}:${purpose}`);
	const toHolder = mode === "special2holder";
	const code = `CD ${special.number}`;
	const intro = options.context === "intro";
	const leech = isLeech(card) && !intro;
	const base = {
		cardId: card.cardId,
		context: options.context,
		...levels,
		label: intro ? LABELS.intro : LABELS.diplomat,
		prompt: toHolder
			? `${code} dipakai perwakilan mana?`
			: `Berapa kode CD untuk ${special.holder}?`,
		answer: toHolder
			? ({ kind: "holder", specialId: special.id } as const)
			: ({ kind: "special-code", specialId: special.id } as const),
		promptAreaId: null,
		setThreshold: null,
		drillPairWith: null,
		reveal: leech
			? { lines: [toHolder ? special.holder : code], note: options.note ?? null }
			: null,
		assisted: leech
	};
	const typed = (level: Level, levelSource: LevelSource): Question => ({
		...base,
		level,
		levelSource,
		questionType: "typed",
		answerForm: toHolder ? "name" : "code",
		choices: [],
		limit: level === 3 ? { ms: TIMED_MS, until: "first-input" } : null
	});
	if (levels.level > 1) return typed(levels.level, levels.levelSource);
	const others = specialChoices(bundle, special, mode, 3, random("distractors"));
	const correct = toHolder ? special.holder : code;
	// Without three valid distractors Perkenalan is informational; other questions become typed.
	if (others.length < 3)
		return intro
			? {
					...base,
					questionType: "intro_read",
					answerForm: "choice",
					label: LABELS.intro,
					prompt: "Kenali kode ini",
					choices: [],
					limit: null,
					reveal: { lines: [correct], note: options.note ?? null },
					assisted: false
				}
			: typed(2, levelSourceFor(2, levels.autoLevel));
	return {
		...base,
		questionType: "choice",
		answerForm: "choice",
		choices: shuffle(
			[correct, ...others.map((entry) => (toHolder ? entry.holder : `CD ${entry.number}`))],
			random("order")
		),
		limit: null
	};
}
