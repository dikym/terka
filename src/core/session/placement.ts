import {
	PLACEMENT_EXPERT_SHARE,
	PLACEMENT_PASS,
	PLACEMENT_STAGE_SIZES,
	type Tier
} from "../../rules";
import type { Bundle, Region } from "../content/schema";
import { eligibleRegions } from "../questions/distractors";
import { seeded, shuffle } from "../random";
import type { AppState } from "../replay/state";
import type { QueueItem } from "./context";

export type Stage = 1 | 2 | 3;
const TIER_OF = { 1: "common", 2: "medium", 3: "rare" } as const;
const SIZES: Record<Stage, number> = {
	1: PLACEMENT_STAGE_SIZES.common,
	2: PLACEMENT_STAGE_SIZES.medium,
	3: PLACEMENT_STAGE_SIZES.rare
};

export const placementAvailable = (state: AppState) => state.firstCountedDay === null;

// Stage 2 takes one code from every group with a medium code first, then fills up.
export function placementStage(bundle: Bundle, runId: string, stage: Stage): string[] {
	const size = SIZES[stage];
	const pool = shuffle(
		eligibleRegions(bundle).filter((region) => region.placementTier === TIER_OF[stage]),
		seeded(`${runId}:${stage}`)
	);
	if (stage !== 2) return pool.slice(0, size).map((region) => region.id);
	const picked: Region[] = [];
	for (const region of pool)
		if (!picked.some((item) => item.group === region.group)) picked.push(region);
	for (const region of pool)
		if (picked.length < size && !picked.includes(region)) picked.push(region);
	return picked.slice(0, size).map((region) => region.id);
}

export const placementItems = (bundle: Bundle, runId: string, stage: Stage): QueueItem[] =>
	placementStage(bundle, runId, stage).map((id) => ({
		cardId: `${id}::code2region`,
		context: "placement",
		slot: "new"
	}));

// `sizes` are the real stage lengths from placementStage; pass marks scale when a tier is short.
export function placementNext(
	answers: { stage: Stage; correct: boolean }[],
	sizes: Record<Stage, number>
): { stage: Stage } | { done: Tier } {
	const passMark = (stage: 1 | 2) =>
		Math.ceil((PLACEMENT_PASS[stage] * sizes[stage]) / SIZES[stage]);
	const asked = (stage: Stage) => answers.filter((answer) => answer.stage === stage).length;
	const right = (stage: Stage) =>
		answers.filter((answer) => answer.stage === stage && answer.correct).length;
	if (asked(1) < sizes[1]) return { stage: 1 };
	if (right(1) < passMark(1)) return { done: "pemula" };
	if (asked(2) < sizes[2]) return { stage: 2 };
	if (right(2) < passMark(2)) return { done: "menengah" };
	if (asked(3) < sizes[3]) return { stage: 3 };
	return { done: right(3) >= PLACEMENT_EXPERT_SHARE * sizes[3] ? "ahli" : "mahir" };
}
