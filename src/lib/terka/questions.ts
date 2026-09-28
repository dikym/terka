import { areaDisplayName, memberAreas } from "./content";
import { matchAnswer } from "./grading";
import {
	type CardProgress,
	type Content,
	type Level,
	type Question,
	type Region,
	type Target
} from "./model";

export function automaticLevel(card: CardProgress): Level {
	if (card.mode === "setrecall") return 3;
	if (card.state === "mature") return 3;
	return card.state === "new" || card.state === "learning" ? 1 : 2;
}

export function regionTarget(content: Content, region: Region): Target {
	return {
		id: region.id,
		name: region.region,
		aliases: [
			...region.aliases,
			...memberAreas(content, region).flatMap((area) => [
				areaDisplayName(area),
				...area.aliases,
				...area.variants
			])
		]
	};
}

export function areaTargets(content: Content, region: Region): Target[] {
	return memberAreas(content, region).map((area) => ({
		id: `${region.id}::${area.id}`,
		name: areaDisplayName(area),
		aliases: [...area.aliases, ...area.variants]
	}));
}

export function dictionary(content: Content, kind: "name" | "code"): Target[] {
	return content.regions.flatMap((region) =>
		kind === "code"
			? [{ id: region.id, name: region.code, aliases: [] }]
			: [regionTarget(content, region), ...areaTargets(content, region)]
	);
}

export function shuffled<T>(items: T[], random: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const sample = random();
		if (sample < 0 || sample >= 1 || !Number.isFinite(sample))
			throw new Error("Random value must be in [0, 1)");
		const j = Math.floor(sample * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

export function generateQuestion(
	content: Content,
	card: CardProgress,
	options: {
		id: string;
		now: number;
		level?: Level;
		format?: Question["format"];
		pair?: [string, string];
		random?: () => number;
	}
): Question {
	const region = content.regions.find((region) => region.id === card.regionId);
	if (!region) throw new Error("Question region is missing");
	const random = options.random ?? Math.random;
	const autoLevel = automaticLevel(card);
	const level = options.pair ? 3 : (options.level ?? autoLevel);
	const question: Question = {
		id: options.id,
		cardId: card.cardId,
		regionId: region.id,
		level,
		autoLevel,
		format: "recall",
		prompt: `${region.code} dipakai daerah mana?`,
		choices: [],
		targets: [regionTarget(content, region)],
		answerKind: "name",
		setTarget: null,
		limitMs: level === 3 ? 8_000 : null,
		drillPair: options.pair ?? null,
		context: [],
		shownAt: options.now
	};
	if (options.pair) {
		const other = content.regions.find((item) => item.id === options.pair![1]);
		if (!other || other.id === region.id || options.pair[0] !== region.id)
			throw new Error("Invalid confusion pair");
		question.format = "drill";
		question.prompt = `${region.code} atau ${other.code}: ${region.region}?`;
		question.targets = [{ id: region.id, name: region.code, aliases: [] }];
		question.answerKind = "code";
		question.choices = shuffled([region.code, other.code], random);
		question.context = [
			`${region.code}: ${region.region} (${region.province}); ${other.code}: ${other.region} (${other.province}).`
		];
		question.limitMs = null;
		return question;
	}
	if (card.mode === "setrecall") {
		if (level !== 3) throw new Error("Set recall requires Level 3");
		question.format = "set";
		question.targets = areaTargets(content, region);
		question.setTarget = Math.min(5, question.targets.length);
		question.prompt = `Sebutkan daerah yang memakai ${region.code}.`;
		question.answerKind = "set";
		question.limitMs = null;
		return question;
	}
	if (card.mode === "region2code") {
		const shown = memberAreas(content, region)[0];
		question.prompt = `Kode pelat ${areaDisplayName(shown)}?`;
		// SRD 2.8: every high code of the shown area is correct; the card stays the asked code's card.
		question.targets = content.regions
			.filter((item) => memberAreas(content, item).some((area) => area.id === shown.id))
			// The asked code first: Level 1 builds its choices from targets[0].
			.sort((a, b) => Number(b.id === region.id) - Number(a.id === region.id))
			.map((item) => ({ id: item.id, name: item.code, aliases: [] }));
		question.answerKind = "code";
	}
	if (level === 1) {
		question.limitMs = null;
		const candidates = shuffled(
			content.regions.filter(
				(item) =>
					item.id !== region.id &&
					item.group !== region.group &&
					item.confidence === "high"
			),
			random
		);
		if (options.format === "truefalse") {
			if (!candidates.length) throw new Error("A distractor from another group is required");
			const truthful = random() < 0.5;
			question.format = "truefalse";
			question.prompt = `${region.code} dipakai ${truthful ? region.region : candidates[0].region}.`;
			question.targets = [
				{
					id: truthful ? region.id : candidates[0].id,
					name: truthful ? "Benar" : "Salah",
					aliases: []
				}
			];
			question.answerKind = "literal";
			question.choices = ["Benar", "Salah"];
			question.limitMs = 2_000;
		} else if (options.format === "not-in") {
			if (!candidates.length) throw new Error("A distractor from another group is required");
			question.format = "not-in";
			question.prompt = `Mana yang tidak memakai ${region.code}?`;
			question.targets = [regionTarget(content, candidates[0])];
			question.choices = shuffled(
				[
					candidates[0].region,
					...memberAreas(content, region).slice(0, 3).map(areaDisplayName)
				],
				random
			);
		} else {
			question.format = "choice";
			question.choices = shuffled(
				[
					question.targets[0].name,
					...candidates
						.slice(0, 3)
						.map((item) => (question.answerKind === "code" ? item.code : item.region))
				],
				random
			);
		}
		if (new Set(question.choices).size < 2)
			throw new Error("At least two distinct choices are required");
	}
	return question;
}

export type AnswerResult = {
	correct: boolean;
	fuzzy: boolean;
	confusedWith: string[];
	setCorrect: number | null;
	corrections: string[];
	ambiguous: boolean;
};
export function evaluateQuestion(
	content: Content,
	question: Question,
	answers: string[]
): AnswerResult {
	const result: AnswerResult = {
		correct: false,
		fuzzy: false,
		confusedWith: [],
		setCorrect: null,
		corrections: [],
		ambiguous: false
	};
	const national = dictionary(content, question.answerKind === "code" ? "code" : "name");
	const matched = new Set<string>();
	if (question.answerKind !== "set" && answers.length !== 1) return result;
	for (const input of answers) {
		const match = matchAnswer(
			input,
			question.targets,
			national,
			question.answerKind === "code"
				? "code"
				: question.answerKind === "literal"
					? "literal"
					: "name"
		);
		if (match.correct && match.matchedId) matched.add(match.matchedId);
		result.fuzzy ||= match.fuzzy;
		result.ambiguous ||= match.ambiguous;
		result.confusedWith.push(...match.confusedWith.filter((id) => id !== question.regionId));
		if (match.correction) result.corrections.push(match.correction);
	}
	if (question.answerKind === "set") {
		result.setCorrect = matched.size;
		result.correct = matched.size >= question.setTarget!;
	} else result.correct = matched.size === 1;
	if (
		!result.correct &&
		question.format === "truefalse" &&
		answers[0]?.trim().toLowerCase() === "benar" &&
		question.targets[0].name === "Salah"
	)
		result.confusedWith.push(question.targets[0].id);
	result.confusedWith = [...new Set(result.confusedWith)];
	return result;
}

export function assertLevelThreeCoverage(content: Content) {
	for (const region of content.regions) {
		const card: CardProgress = {
			cardId: `${region.id}::code2region`,
			regionId: region.id,
			mode: "code2region",
			state: "new",
			stability: 0,
			difficulty: 0,
			interval: 0,
			due: 0,
			reps: 0,
			lapses: 0,
			step: 0,
			lastReview: null,
			scheduledDay: null,
			pendingDue: null,
			passedLevels: [],
			suspensionReason: null
		};
		const question = generateQuestion(content, card, {
			id: `coverage-${region.id}`,
			now: 0,
			level: 3
		});
		if (!evaluateQuestion(content, question, [memberAreas(content, region)[0].name]).correct)
			throw new Error(`No valid Level 3 question for ${region.code}`);
	}
}
