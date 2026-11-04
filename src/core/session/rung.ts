import { ladderScale, type RungMemory } from "@/core/questions/rung";
import { schedulerAt } from "@/core/replay/params";
import type { AppState } from "@/core/replay/state";
import type { CardMemory } from "@/core/scheduling/card-memory";
import { retrievability } from "@/core/scheduling/fsrs";

export function rungMemory(state: AppState, card: CardMemory, now: number): RungMemory {
	return {
		retrievability: retrievability(schedulerAt(state.params, now), card, now),
		scale: ladderScale(state.levelTwoResults)
	};
}
