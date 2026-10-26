import { PLACEMENT_LIMIT_MS, TIMED_LIMIT_MS, TRUE_FALSE_LIMIT_MS } from "@/rules";
import { areaDisplayName, highMembers, provinceName } from "../answers/dictionary";
import { groupName } from "../content/names";
import { setThreshold } from "../answers/match-set";
import type { Area, Bundle, Region } from "../content/schema";
import { shuffle } from "../random";
import { isLeech } from "../scheduling/card";
import type { CardMemory } from "../scheduling/card-memory";
import { foreignAreas, NATIONAL, otherCodes } from "./distractors";
import {
	type CompareHint,
	LABELS,
	type Level,
	type LevelSource,
	parseCardId,
	type Question,
	type QuestionAnswer,
	type QuestionOptions,
	questionRandom
} from "./question";

export type ResolvedLevels = { level: Level; autoLevel: Level; levelSource: LevelSource };

export const levelSourceFor = (level: Level, autoLevel: Level): LevelSource =>
	level === autoLevel ? "auto" : level > autoLevel ? "manual_up" : "manual_down";

function findRegion(bundle: Pick<Bundle, "regions">, id: string): Region {
	const region = bundle.regions.find((item) => item.id === id);
	if (!region) throw new Error(`unknown region ${id}`);
	return region;
}

// The first difference that separates the two codes: group, then province, then an area of their own.
function compareHint(bundle: Bundle, a: Region, b: Region): CompareHint {
	const place = (region: Region, other: Region) => {
		if (region.group !== other.group) return groupName(bundle, region.group);
		if (region.province !== other.province) return provinceName(region.province);
		const others = new Set(highMembers(bundle, other).map((area) => area.id));
		const own = highMembers(bundle, region);
		return areaDisplayName(own.find((area) => !others.has(area.id)) ?? own[0]);
	};
	return { a: { code: a.code, place: place(a, b) }, b: { code: b.code, place: place(b, a) } };
}

export function buildRegionQuestion(
	card: CardMemory,
	mode: "code2region" | "region2code" | "setrecall",
	bundle: Bundle,
	levels: ResolvedLevels,
	options: QuestionOptions
): Question {
	const region = findRegion(bundle, parseCardId(card.cardId).contentId);
	const members = highMembers(bundle, region);
	if (!members.length) throw new Error(`${region.id}: no high member areas`);
	const random = (purpose: string) => questionRandom(card, options, purpose);
	const scope = options.scope ?? NATIONAL;
	const intro = options.context === "intro";
	const leech = isLeech(card) && !intro;
	const base = {
		cardId: card.cardId,
		context: options.context,
		...levels,
		choices: [] as string[],
		promptAreaId: null as string | null,
		limit: null as Question["limit"],
		setThreshold: null as number | null,
		drillPairWith: null as string | null,
		reveal: leech ? { lines: members.map(areaDisplayName), note: options.note ?? null } : null,
		assisted: leech
	};

	if (options.context === "drill") {
		const other = findRegion(bundle, options.drillPair ?? "");
		const otherIds = new Set(highMembers(bundle, other).map((area) => area.id));
		const own = members.filter((area) => !otherIds.has(area.id));
		const shown = shuffle(own.length ? own : members, random("drill-area"))[0];
		const codeIds = bundle.regions
			.filter((item) =>
				item.areas.some((m) => m.areaId === shown.id && m.confidence === "high")
			)
			.map((item) => item.id);
		return {
			...base,
			questionType: "choice",
			answerForm: "code",
			label: LABELS.compare,
			prompt: `${region.code} atau ${other.code}: ${areaDisplayName(shown)}?`,
			choices: shuffle([region.code, other.code], random("order")),
			answer: { kind: "region-code", areaId: shown.id, codeIds },
			promptAreaId: shown.id,
			drillPairWith: other.id,
			hint: compareHint(bundle, region, other)
		};
	}

	// Perkenalan of a set card stays a single answer (Tebak daerah below); only later reviews ask for the set.
	if (mode === "setrecall" && !intro)
		return {
			...base,
			level: 3,
			autoLevel: 3,
			levelSource: "auto",
			questionType: "setrecall",
			answerForm: "name",
			label: LABELS.set,
			prompt: `Sebutkan daerah yang memakai ${region.code}.`,
			answer: { kind: "set", codeId: region.id },
			setThreshold: setThreshold(members.length)
		};

	let prompt: string;
	let answer: QuestionAnswer;
	let answerForm: "code" | "name";
	let label: string;
	let promptAreaId: string | null = null;
	let validCodeIds: string[] = [region.id];
	if (mode === "region2code") {
		const candidates =
			members.length > 1
				? members.filter((area) => area.id !== options.previousPromptAreaId)
				: members;
		const shown = shuffle(candidates, random("prompt-area"))[0];
		validCodeIds = bundle.regions
			.filter((item) =>
				item.areas.some((m) => m.areaId === shown.id && m.confidence === "high")
			)
			.map((item) => item.id);
		prompt = `Kode pelat ${areaDisplayName(shown)}?`;
		answer = { kind: "region-code", areaId: shown.id, codeIds: validCodeIds };
		answerForm = "code";
		label = LABELS.guessCode;
		promptAreaId = shown.id;
	} else {
		prompt = `${region.code} dipakai daerah mana?`;
		answer = { kind: "area", codeId: region.id };
		answerForm = "name";
		label = LABELS.guessArea;
	}

	const typed = (level: Level, levelSource: LevelSource): Question => ({
		...base,
		level,
		levelSource,
		questionType: "typed",
		answerForm,
		label: level === 3 ? LABELS.timed : label,
		prompt,
		answer,
		promptAreaId,
		limit: level === 3 ? { ms: TIMED_LIMIT_MS, until: "first-input" } : null
	});
	if (options.context === "placement")
		return { ...typed(2, "auto"), limit: { ms: PLACEMENT_LIMIT_MS, until: "first-input" } };
	if (levels.level > 1) return typed(levels.level, levels.levelSource);

	const format = options.format ?? "choice";
	const pickMember = (): Area => shuffle(members, random("answer"))[0];
	if (mode === "code2region" && format === "truefalse") {
		const [foreign] = foreignAreas(bundle, region, scope, 1, random("distractors"), {
			preferOtherProvince: true
		});
		const truthful = !foreign || random("truefalse")() < 0.5;
		const shown = truthful ? pickMember() : foreign.area;
		return {
			...base,
			questionType: "truefalse",
			answerForm: "choice",
			label: LABELS.trueFalse,
			prompt: `${region.code} dipakai ${areaDisplayName(shown)}.`,
			choices: ["Benar", "Salah"],
			answer: {
				kind: "literal",
				value: truthful ? "Benar" : "Salah",
				confusedWith: truthful ? null : foreign.owner.id
			},
			limit: { ms: TRUE_FALSE_LIMIT_MS, until: "answer" }
		};
	}
	if (mode === "code2region" && format === "oddoneout") {
		const [foreign] = foreignAreas(bundle, region, scope, 1, random("distractors"), {
			preferOtherProvince: true
		});
		if (foreign && members.length >= 3) {
			const odd = areaDisplayName(foreign.area);
			return {
				...base,
				questionType: "oddoneout",
				answerForm: "choice",
				label: LABELS.oddOneOut,
				prompt: `Mana yang tidak memakai ${region.code}?`,
				choices: shuffle(
					[odd, ...shuffle(members, random("answer")).slice(0, 3).map(areaDisplayName)],
					random("order")
				),
				answer: { kind: "literal", value: odd, confusedWith: null }
			};
		}
	}

	const choices =
		mode === "region2code"
			? (() => {
					const others = otherCodes(
						bundle,
						region,
						scope,
						new Set(validCodeIds),
						3,
						random("distractors")
					);
					return others.length === 3
						? shuffle(
								[region.code, ...others.map((item) => item.code)],
								random("order")
							)
						: [];
				})()
			: (() => {
					const foreign = foreignAreas(bundle, region, scope, 3, random("distractors"), {
						preferOtherProvince: true
					});
					return foreign.length === 3
						? shuffle(
								[
									areaDisplayName(pickMember()),
									...foreign.map(({ area }) => areaDisplayName(area))
								],
								random("order")
							)
						: [];
				})();
	// Without three valid distractors Perkenalan is informational; other questions become typed.
	if (!choices.length)
		return intro
			? {
					...base,
					questionType: "intro_read",
					answerForm: "choice",
					label: LABELS.intro,
					prompt: "Kenali kode ini",
					answer,
					promptAreaId,
					reveal: { lines: members.map(areaDisplayName), note: options.note ?? null },
					assisted: false
				}
			: typed(2, levelSourceFor(2, levels.autoLevel));
	return {
		...base,
		questionType: "choice",
		answerForm: "choice",
		label: intro ? LABELS.intro : label,
		prompt,
		answer,
		promptAreaId,
		choices
	};
}
