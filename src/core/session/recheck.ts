import { RECHECK_AWAY_DAYS, RECHECK_SIZE, REVIEW_CAP_PER_DAY } from "@/rules";
import type { Bundle } from "../content/schema";
import { schedulerAt } from "../replay/params";
import type { AppState } from "../replay/state";
import { effectiveCard } from "../replay/universe";
import { retrievability } from "../scheduling/fsrs";
import { addDays } from "../time/day";
import {
	cardsWhere,
	compareText,
	contentOf,
	isGroupA,
	prepare,
	type QueueItem,
	type SessionContext,
	todayOf
} from "./context";
import { dueReviewCount, dueReviews } from "./queue";

export function recheckOffer(input: AppState, ctx: SessionContext): boolean {
	const today = todayOf(ctx);
	const days = [...input.activeDays].sort(compareText);
	const last = days.at(-1);
	if (last === undefined || last >= today || last > addDays(today, -RECHECK_AWAY_DAYS))
		return false;
	return dueReviewCount(input, ctx) > REVIEW_CAP_PER_DAY;
}

// Takes one card per group in turn, weakest first, so every group that fell behind is measured.
export function recheckQueue(
	input: AppState,
	bundle: Bundle,
	ctx: SessionContext
): { items: QueueItem[]; predicted: Map<string, number> } {
	const state = prepare(input, ctx);
	const due = dueReviews(state, cardsWhere(state, isGroupA), todayOf(ctx), ctx.now, "recheck");
	const groupOf = new Map(bundle.regions.map((region) => [region.id, region.group]));
	const lanes = bundle.groups
		.map((group) => due.filter((item) => groupOf.get(contentOf(item.cardId)) === group.id))
		.filter((lane) => lane.length);
	const items: QueueItem[] = [];
	for (let round = 0; items.length < RECHECK_SIZE && lanes.some((lane) => lane[round]); round++)
		for (const lane of lanes)
			if (lane[round] && items.length < RECHECK_SIZE) items.push(lane[round]);
	const scheduler = schedulerAt(state.params, ctx.now);
	const recall = new Map<string, number[]>();
	for (const item of items) {
		const group = groupOf.get(contentOf(item.cardId))!;
		const r = retrievability(scheduler, effectiveCard(state, item.cardId)!, ctx.now);
		recall.set(group, [...(recall.get(group) ?? []), r]);
	}
	const predicted = new Map(
		[...recall].map(([group, values]) => [
			group,
			values.reduce((sum, value) => sum + value, 0) / values.length
		])
	);
	return { items, predicted };
}
