import { ladderScale, type RungMemory } from "../questions/rung";
import { schedulerAt } from "../replay/params";
import type { AppState } from "../replay/state";
import type { CardMemory } from "../scheduling/card-memory";
import { retrievability } from "../scheduling/fsrs";

export function rungMemory(state: AppState, card: CardMemory, now: number): RungMemory {
	return {
		retrievability: retrievability(schedulerAt(state.params, now), card, now),
		scale: ladderScale(state.levelTwoResults)
	};
}
