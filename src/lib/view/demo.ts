import { provinceName } from "@/core/answers/dictionary";
import type { Bundle } from "@/core/content/schema";
import { eligibleRegions } from "@/core/questions/distractors";
import { areaSummary } from "./stats";
import type { DemoQuestion } from "./demo-round";

/**
 * The landing page's sample questions, worked out at build time so the page ships only these few
 * lines and none of the plate data. The right province comes first; a round shuffles the choices.
 */
export function demoQuestions(bundle: Bundle): DemoQuestion[] {
	const common = eligibleRegions(bundle).filter((region) => region.placementTier === "common");
	const provinces = [...new Set(common.map((region) => provinceName(region.province)))];
	return common.map((region, index) => {
		const answer = provinceName(region.province);
		const others = provinces.filter((name) => name !== answer);
		const wrong = [0, 1, 2].map((step) => others[(index + step * 2) % others.length]);
		return {
			code: region.code,
			answer,
			choices: [answer, ...new Set(wrong)].slice(0, 4),
			areas: areaSummary(bundle, region, 3)
		};
	});
}
