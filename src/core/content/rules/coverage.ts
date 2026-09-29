import {
	areaDisplayName,
	buildDictionary,
	highMembers,
	type NameDictionary
} from "../../answers/dictionary";
import { matchRegionCode } from "../../answers/match-code";
import { matchName } from "../../answers/match-name";
import { matchSet } from "../../answers/match-set";
import { matchHolder, matchSpecialCode } from "../../answers/match-special";
import { buildQuestion } from "../../questions/build";
import { eligibleRegions } from "../../questions/distractors";
import type { Question } from "../../questions/question";
import { newCard } from "../../scheduling/card-memory";
import { error, type ContentMessage } from "../messages";
import type { Bundle } from "../schema";

const SET_MIN_AREAS = 3;

// Cards that plates.json can create (SRD 2.9, 4.8, AC-37).
export function cardIdsOf(bundle: Bundle): string[] {
	const regionCards = eligibleRegions(bundle).flatMap((region) => {
		// Count memberships, not resolved areas: a broken area id must fail per card below, not abort the whole check.
		const count = region.areas.filter((membership) => membership.confidence === "high").length;
		return [
			`${region.id}::code2region`,
			`${region.id}::region2code`,
			...(count >= SET_MIN_AREAS ? [`${region.id}::setrecall`] : [])
		];
	});
	const specialCards = bundle.specials
		.filter((entry) => entry.confidence === "high" && !entry.needsReview)
		.flatMap((entry) => [`${entry.id}::special2holder`, `${entry.id}::holder2special`]);
	return [...regionCards, ...specialCards];
}

const accepted = (matchType: string) =>
	matchType === "exact" || matchType === "variant" || matchType === "typo";

function answersCorrectly(question: Question, bundle: Bundle, dictionary: NameDictionary): boolean {
	const answer = question.answer;
	switch (answer.kind) {
		case "area": {
			const region = bundle.regions.find((item) => item.id === answer.codeId)!;
			return accepted(
				matchName(areaDisplayName(highMembers(bundle, region)[0]), region.id, dictionary)
					.matchType
			);
		}
		case "region-code": {
			const code = bundle.regions.find((item) => item.id === answer.codeIds[0])!.code;
			return matchRegionCode(code, answer.codeIds, bundle).matchType === "exact";
		}
		case "holder": {
			const special = bundle.specials.find((item) => item.id === answer.specialId)!;
			return matchHolder(special.holder, special.id, bundle).matchType === "exact";
		}
		case "special-code": {
			const special = bundle.specials.find((item) => item.id === answer.specialId)!;
			return (
				matchSpecialCode(`CD ${special.number}`, special.id, bundle).matchType === "exact"
			);
		}
		case "set": {
			const region = bundle.regions.find((item) => item.id === answer.codeId)!;
			return matchSet(highMembers(bundle, region).map(areaDisplayName), region.id, dictionary)
				.correct;
		}
		case "literal":
			return true;
	}
}

// AC-1 / TR-04: every creatable card has a valid Level 3 form whose canonical answer is accepted.
export function coverageRules(bundle: Bundle): ContentMessage[] {
	const out: ContentMessage[] = [];
	let dictionary: NameDictionary;
	try {
		dictionary = buildDictionary(bundle);
	} catch (cause) {
		return [
			error("level-three-coverage", cause instanceof Error ? cause.message : String(cause))
		];
	}
	for (const cardId of cardIdsOf(bundle)) {
		try {
			const card = {
				...newCard(cardId),
				state: "review" as const,
				intervalDays: 30,
				reps: 1
			};
			const question = buildQuestion(card, bundle, { context: "daily", level: 3 });
			if (question.level !== 3 || !answersCorrectly(question, bundle, dictionary))
				out.push(error("level-three-coverage", `${cardId}: no valid Level 3 question`));
		} catch (cause) {
			out.push(
				error(
					"level-three-coverage",
					`${cardId}: ${cause instanceof Error ? cause.message : String(cause)}`
				)
			);
		}
	}
	return out;
}
