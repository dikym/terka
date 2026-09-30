import type { Bundle } from "../content/schema";
import type { ReviewLog } from "../log/events";
import type { AppState } from "../replay/state";
import { compareText } from "../session/context";
import { scopeMastery } from "./mastery";

export function sessionSummary(
	before: AppState,
	after: AppState,
	answers: ReviewLog[],
	bundle: Bundle
) {
	const graded = answers.filter(
		(answer) => answer.context !== "intro" && answer.correct !== null
	);
	const correct = graded.filter((answer) => answer.correct === true).length;
	const latencies = answers
		.map((answer) => answer.msToFirstKey)
		.filter((value): value is number => value !== null);
	const newPairs = [...after.pairs]
		.filter(([key, pair]) => pair.flagged && !before.pairs.get(key)?.flagged)
		.map(([key]) => key)
		.sort(compareText);
	const groupOf = new Map(bundle.regions.map((region) => [region.id, region.group]));
	const groups = [
		...new Set(
			answers
				.map((answer) => groupOf.get(answer.contentId))
				.filter((group): group is string => group !== undefined)
		)
	].sort(compareText);
	const masteryChanges = groups
		.map((groupId) => ({
			groupId,
			before: scopeMastery(before, bundle, { level: "group", id: groupId }).percent,
			after: scopeMastery(after, bundle, { level: "group", id: groupId }).percent
		}))
		.filter((change) => change.before !== change.after);
	return {
		answered: answers.length,
		correct,
		accuracy: graded.length ? Math.round((correct / graded.length) * 100) : null,
		meanLatencyMs: latencies.length
			? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
			: null,
		newPairs,
		masteryChanges
	};
}
