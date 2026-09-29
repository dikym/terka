import type { CardMemory } from "../scheduling/card-memory";
import { MATURE_INTERVAL_DAYS } from "../scheduling/card";
import type { CardMode, Level, LevelSource, QuestionContext } from "./question";

const FIXED_CONTEXTS: readonly QuestionContext[] = ["intro", "drill", "kilat", "placement"];

// SRD 3.2 "Penentuan Level Otomatis", checked in order.
export function automaticLevel(card: CardMemory, mode: CardMode, context: QuestionContext): Level {
	if (context === "intro") return 1;
	if (context === "drill") return 3;
	if (context === "kilat") return 1;
	if (context === "placement") return 2;
	if (mode === "setrecall") return 3;
	if (card.state === "new" || card.state === "learning") return 1;
	if (card.state === "review" && card.intervalDays >= MATURE_INTERVAL_DAYS && !card.passedLevel3)
		return 3;
	if (card.state === "mature") return 3;
	return 2;
}

// SRD 3.3: manual changes are allowed except where SRD 3.5 fixes the level.
export function resolveLevel(
	auto: Level,
	requested: Level | undefined,
	context: QuestionContext
): { level: Level; levelSource: LevelSource } {
	if (requested === undefined || requested === auto) return { level: auto, levelSource: "auto" };
	if (FIXED_CONTEXTS.includes(context)) throw new Error(`Level is fixed in ${context}`);
	return { level: requested, levelSource: requested > auto ? "manual_up" : "manual_down" };
}
