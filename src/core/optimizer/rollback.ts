import { ROLLBACK_MARGIN, ROLLBACK_REVIEWS, TARGET_RETENTION } from "@/rules";
import type { FsrsParams } from "../log/events";
import { activation, paramsAt } from "../replay/params";
import type { CountedAnswer } from "./counted";
import { activeList, identityOf, type ParamsDraft, weightsOf } from "./draft";

// Float noise must not turn exactly 5 points into "more than 5 points".
const EPSILON = 1e-9;

export async function rollbackDraft(
	counted: readonly CountedAnswer[],
	rows: readonly FsrsParams[],
	now: number
): Promise<ParamsDraft | null> {
	const list = activeList(rows);
	const current = paramsAt(list, now);
	// A rollback row stores the restored weights as "new", so it never looks better than its baseline.
	if (!current || current.logloss >= current.baselineLogloss) return null;
	const from = activation(current);
	const window = counted
		.filter((answer) => answer.at >= from)
		.sort((a, b) => a.at - b.at)
		.slice(0, ROLLBACK_REVIEWS);
	if (window.length < ROLLBACK_REVIEWS) return null;
	const settled = window.filter((answer) => answer.settled);
	if (settled.length === 0) return null;
	const retention = settled.filter((answer) => answer.correct).length / settled.length;
	if (Math.abs(retention - TARGET_RETENTION) <= ROLLBACK_MARGIN + EPSILON) return null;
	const before = list.filter((row) => row !== current);
	return {
		algorithm: "fsrs-6",
		libraryVersion: current.libraryVersion,
		weights: weightsOf(paramsAt(before, from)),
		status: "active",
		activatedAt: now,
		createdAt: now,
		...(await identityOf(window)),
		logloss: current.baselineLogloss,
		rmse: current.baselineRmse,
		baselineLogloss: current.logloss,
		baselineRmse: current.rmse
	};
}
