import {
	LADDER_MIN_SAMPLES,
	LADDER_SCALE_MAX,
	LADDER_SCALE_MIN,
	LADDER_SPREAD,
	LADDER_TARGET,
	RUNG_FADED_RETRIEVABILITY,
	RUNG_HARD_DIFFICULTY,
	RUNG_STABILITY_DAYS
} from "@/rules";
import type { CardMemory } from "../scheduling/card-memory";
import type { Level, LevelSource, QuestionContext } from "./question";

export type Rung = 1 | 2 | 3 | 4 | 5 | 6;
export type RungMemory = { retrievability: number; scale: number };
export const NEUTRAL_MEMORY: RungMemory = { retrievability: 1, scale: 1 };

const BANDS: Record<Level, [Rung, Rung]> = { 1: [1, 2], 2: [3, 5], 3: [6, 6] };

export function baseRung(card: CardMemory, context: QuestionContext, memory: RungMemory): Rung {
	// Only the introduction meets a card before it has been answered once.
	if (context === "intro" || card.state === "new") return 1;
	// Cek Ingatan measures recall, so it always takes the hardest form its level allows.
	if (context === "recheck") return 6;
	if (card.state === "learning") return 2;
	if (card.state === "relearning") return 3;
	if (card.state === "mature") return 6;
	const [low, high] = RUNG_STABILITY_DAYS.map((days) => days * memory.scale);
	let rung = card.stability < low ? 3 : card.stability < high ? 4 : 5;
	if (card.difficulty >= RUNG_HARD_DIFFICULTY) rung--;
	if (memory.retrievability < RUNG_FADED_RETRIEVABILITY) rung--;
	// A reviewed card never drops back to the introduction rungs, even where its level allows them.
	return Math.max(3, rung) as Rung;
}

// A manual level asks for that level's full demand, so it takes the top of the band.
export function rungForLevel(base: Rung, level: Level, source: LevelSource): Rung {
	const [low, high] = BANDS[level];
	if (source !== "auto") return high;
	return Math.min(high, Math.max(low, base)) as Rung;
}

// Shrinks the stability bounds for a user who rarely misses, widens them for one who often does.
export function ladderScale(results: readonly boolean[]): number {
	if (results.length < LADDER_MIN_SAMPLES) return 1;
	const rate = results.filter(Boolean).length / results.length;
	const scale = 2 ** ((LADDER_TARGET - rate) / LADDER_SPREAD);
	return Math.min(LADDER_SCALE_MAX, Math.max(LADDER_SCALE_MIN, scale));
}
