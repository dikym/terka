import { areaDisplayName, inScope, memberAreas } from "./content";
import { matchAnswer } from "./grading";
import {
	type Area,
	type CardProgress,
	type Content,
	type Level,
	type Question,
	type Region,
	type Scope,
	type Target
} from "./model";
import {
	MATURE_INTERVAL_DAYS,
	SET_THRESHOLD_MAX,
	TIMED_LIMIT_MS,
	TRUE_FALSE_LIMIT_MS
} from "../../rules";

export function automaticLevel(card: CardProgress): Level {
	if (card.mode === "setrecall" || card.state === "mature") return 3;
	if (card.state === "new" || card.state === "learning") return 1;
	// SRD 3.2: a long review interval without a Level 3 pass triggers the automatic mastery test.
	if (
		card.state === "review" &&
		card.interval >= MATURE_INTERVAL_DAYS &&
		!card.passedLevels.includes(3)
	)
		return 3;
	return 2;
}

// SRD 4.4: true/false is limited until the answer locks; typed Level 3 only until the first input.
export function questionTimedOut(
	question: Pick<Question, "format" | "limitMs">,
	elapsedMs: number,
	msToFirstKey: number | null
): boolean {
	if (question.limitMs === null) return false;
	if (question.format === "truefalse" || msToFirstKey === null)
		return elapsedMs > question.limitMs;
	return msToFirstKey > question.limitMs;
}

export function regionTarget(content: Content, region: Region): Target {
	return {
		id: region.id,
		name: region.region,
		aliases: [
			...region.aliases,
			...memberAreas(content, region).flatMap((area) => [
				areaDisplayName(area),
				...area.aliases
			])
		],
		variants: memberAreas(content, region).flatMap((area) => area.variants)
	};
}

export function areaTargets(content: Content, region: Region): Target[] {
	return memberAreas(content, region).map((area) => ({
		id: `${region.id}::${area.id}`,
		name: areaDisplayName(area),
		aliases: [...area.aliases],
		variants: [...area.variants]
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

// SRD 2.8: the scope first (the card's own group when its code is outside the scope), then the group, then national.
function sourceLayers(content: Content, region: Region, scope: Scope): Region[][] {
	const eligible = content.regions.filter(
		(item) => item.confidence === "high" && memberAreas(content, item).length > 0
	);
	const group = eligible.filter((item) => item.group === region.group);
	return [
		inScope(region, scope) ? eligible.filter((item) => inScope(item, scope)) : group,
		group,
		eligible
	];
}

function pickLayered<T>(
	layers: T[][],
	key: (item: T) => string,
	count: number,
	random: () => number
): T[] {
	const chosen = new Map<string, T>();
	for (const layer of layers)
		for (const item of shuffled(layer, random)) {
			if (chosen.size === count) return [...chosen.values()];
			if (!chosen.has(key(item))) chosen.set(key(item), item);
		}
	return [...chosen.values()];
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
		scope?: Scope;
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
		limitMs: level === 3 ? TIMED_LIMIT_MS : null,
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
		question.setTarget = Math.min(SET_THRESHOLD_MAX, question.targets.length - 1);
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
		const layers = sourceLayers(
			content,
			region,
			options.scope ?? { level: "national", id: "indonesia" }
		);
		const members = memberAreas(content, region);
		const memberIds = new Set(members.map((area) => area.id));
		const foreignAreas = (count: number) =>
			pickLayered(
				layers.map((layer) =>
					layer.flatMap((item) =>
						memberAreas(content, item)
							.filter((area) => !memberIds.has(area.id))
							.map((area) => ({ owner: item, area }))
					)
				),
				({ area }) => areaDisplayName(area),
				count,
				random
			);
		const anyMember = () => shuffled(members, random)[0];
		if (options.format === "truefalse") {
			const truthful = random() < 0.5;
			const [foreign] = foreignAreas(1);
			if (!truthful && !foreign) throw new Error("A non-member area is required");
			const shown: Area = truthful ? anyMember() : foreign.area;
			question.format = "truefalse";
			question.prompt = `${region.code} dipakai ${areaDisplayName(shown)}.`;
			question.targets = [
				{
					id: truthful ? region.id : foreign.owner.id,
					name: truthful ? "Benar" : "Salah",
					aliases: []
				}
			];
			question.answerKind = "literal";
			question.choices = ["Benar", "Salah"];
			question.limitMs = TRUE_FALSE_LIMIT_MS;
		} else if (options.format === "not-in") {
			const [foreign] = foreignAreas(1);
			if (!foreign) throw new Error("A non-member area is required");
			question.format = "not-in";
			question.prompt = `Mana yang tidak memakai ${region.code}?`;
			question.targets = [
				{ id: foreign.owner.id, name: areaDisplayName(foreign.area), aliases: [] }
			];
			question.choices = shuffled(
				[
					areaDisplayName(foreign.area),
					...shuffled(members, random).slice(0, 3).map(areaDisplayName)
				],
				random
			);
		} else if (question.answerKind === "code") {
			const valid = new Set(question.targets.map((target) => target.id));
			const others = pickLayered(
				layers.map((layer) => layer.filter((item) => !valid.has(item.id))),
				(item) => item.code,
				3,
				random
			);
			question.format = "choice";
			question.choices = shuffled([region.code, ...others.map((item) => item.code)], random);
		} else {
			question.format = "choice";
			question.choices = shuffled(
				[
					areaDisplayName(anyMember()),
					...foreignAreas(3).map(({ area }) => areaDisplayName(area))
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
			suspensionReason: null,
			resumeState: null
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
