import type * as Binding from "@open-spaced-repetition/binding";
import type { ReviewSeq, Trainer } from "@/core/optimizer/items";
import { TARGET_RETENTION } from "@/rules";

export type BindingModule = Pick<
	typeof Binding,
	| "FSRSBinding"
	| "FSRSBindingItem"
	| "FSRSBindingReview"
	| "computeParameters"
	| "computeOptimalSteps"
>;

// Bump with the pinned package version in package.json.
export const VERSION = "binding@0.6.0-beta.6";

export function createTrainer(binding: BindingModule): Trainer {
	const toItems = (items: ReviewSeq[]) =>
		items.map(
			(item) =>
				new binding.FSRSBindingItem(
					item.reviews.map(
						(review) => new binding.FSRSBindingReview(review.rating, review.deltaT)
					)
				)
		);
	return {
		version: VERSION,
		// The package defaults to FSRS-7; the scheduler runs FSRS-6 with 21 weights.
		train: (items) =>
			binding.computeParameters(toItems(items), {
				enableShortTerm: false,
				modelVersion: "FSRS-6"
			}),
		evaluate: async (weights, items) => {
			const result = new binding.FSRSBinding([...weights]).evaluate(toItems(items));
			return { logLoss: result.logLoss, rmse: result.rmseBins };
		},
		steps: async (revlog, decay) => {
			const result = binding.computeOptimalSteps(revlog, TARGET_RETENTION, decay);
			return {
				learning: result.recommendedLearningSteps,
				relearning: result.recommendedRelearningSteps
			};
		}
	};
}
