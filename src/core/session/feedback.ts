import { highMembers } from "../answers/dictionary";
import type { Bundle } from "../content/schema";
import type { Question } from "../questions/question";
import type { Checked } from "./check";

// After a correct Tebak daerah the result also names a few other areas of the same code.
export function alsoCorrect(
	bundle: Bundle,
	question: Question,
	checked: Checked,
	limit = 3
): string[] {
	if (question.answer.kind !== "area" || checked.correct !== true) return [];
	const { codeId } = question.answer;
	const region = bundle.regions.find((item) => item.id === codeId);
	if (!region) return [];
	return highMembers(bundle, region)
		.filter((area) => area.id !== checked.acceptedAreaId)
		.slice(0, limit)
		.map((area) => area.name);
}
