import { OPTIMIZE_MIN_GAIN } from "@/rules";
import type { Bundle } from "../content/schema";
import type { FsrsParams, LearningEvent } from "../log/events";
import { type CountedAnswer, countedAnswers } from "./counted";
import { currentWeights, identityOf, type ParamsDraft } from "./draft";
import { optimizationDue } from "./due";
import { buildItems, type StepSuggestion, splitByTime, type Trainer } from "./items";
import { rollbackDraft } from "./rollback";
import { revlogCsv } from "./steps";

const EPSILON = 1e-12;

export const accepts = (m: {
	logloss: number;
	rmse: number;
	baselineLogloss: number;
	baselineRmse: number;
}) =>
	m.logloss <= m.baselineLogloss * (1 - OPTIMIZE_MIN_GAIN) + EPSILON && m.rmse <= m.baselineRmse;

export async function decide(
	input: { counted: CountedAnswer[]; rows: FsrsParams[]; now: number },
	trainer: Trainer
): Promise<ParamsDraft | null> {
	const { counted, rows, now } = input;
	const rollback = await rollbackDraft(counted, rows, now);
	if (rollback) return rollback;
	if (!optimizationDue(counted, rows, now)) return null;
	const { train, test } = splitByTime(buildItems(counted));
	if (train.length === 0 || test.length === 0) return null;
	const weights = await trainer.train(train);
	const fresh = await trainer.evaluate(weights, test);
	const baseline = await trainer.evaluate(currentWeights(rows, now), test);
	const metrics = {
		logloss: fresh.logLoss,
		rmse: fresh.rmse,
		baselineLogloss: baseline.logLoss,
		baselineRmse: baseline.rmse
	};
	// NaN becomes null on the wire; the server would refuse the row and quarantine it.
	if (![...weights, ...Object.values(metrics)].every(Number.isFinite))
		throw new Error("the optimizer returned non-finite values");
	const accepted = accepts(metrics);
	return {
		algorithm: "fsrs-6",
		libraryVersion: trainer.version,
		weights,
		status: accepted ? "active" : "rejected",
		activatedAt: accepted ? now : null,
		createdAt: now,
		...(await identityOf(counted)),
		...metrics
	};
}

export type OptimizeOutcome = { draft: ParamsDraft | null; steps: StepSuggestion | null };

// The whole decision from the raw log; runs inside the optimizer worker.
export async function optimizeLog(
	input: { events: readonly LearningEvent[]; bundle: Bundle; now: number },
	trainer: Trainer
): Promise<OptimizeOutcome> {
	const counted = countedAnswers(input.events, input.bundle);
	if (!counted) return { draft: null, steps: null };
	const rows = input.events.flatMap((event) =>
		event.table === "fsrs_params" ? [event.row] : []
	);
	const rollback = await rollbackDraft(counted, rows, input.now);
	if (rollback) return { draft: rollback, steps: null };
	const draft = await decide({ counted, rows, now: input.now }, trainer);
	if (!draft || !trainer.steps) return { draft, steps: null };
	// A suggestion that cannot be computed must not cost the decision itself.
	const steps = await trainer.steps(revlogCsv(counted), draft.weights[20]).catch(() => null);
	return { draft, steps };
}
