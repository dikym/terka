import type { Bundle, Special } from "../content/schema";
import { seeded, shuffle } from "../random";
import { isLeech } from "../scheduling/card";
import type { CardMemory } from "../scheduling/card-memory";
import { specialChoices } from "./distractors";
import { LABELS, parseCardId, type Question, type QuestionOptions } from "./question";
import type { ResolvedLevels } from "./region";

const TIMED_MS = 8_000;

// SRD 2.9: Tebak diplomat in both directions; the registration serial is never asked.
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
	if (levels.level > 1)
		return {
			...base,
			questionType: "typed",
			answerForm: toHolder ? "name" : "code",
			choices: [],
			limit: levels.level === 3 ? { ms: TIMED_MS, until: "first-input" } : null
		};
	const others = specialChoices(bundle, special, mode, 3, random("distractors"));
	const correct = toHolder ? special.holder : code;
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
