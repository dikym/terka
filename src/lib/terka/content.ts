import {
	type Area,
	type CardMode,
	type CardProgress,
	type Content,
	contentSchema,
	type Progress,
	progressSchema,
	type Region,
	type Scope
} from "./model";
import { createClock } from "./time";
import { SET_MIN_AREAS } from "@/rules";

function unique(values: string[], label: string) {
	if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}

export function parseContent(value: unknown): Content {
	const content = contentSchema.parse(value);
	unique(
		content.regions.map((region) => region.id),
		"region IDs"
	);
	unique(
		content.regions.map((region) => region.code),
		"codes"
	);
	unique(
		content.areas.map((area) => area.id),
		"area IDs"
	);
	unique(
		content.facts.map((fact) => fact.id),
		"fact IDs"
	);
	const areaIds = new Set(content.areas.map((area) => area.id));
	const factIds = new Set(content.facts.map((fact) => fact.id));
	const provinceGroups = new Map<string, string>();
	for (const region of content.regions) {
		if (["RI", "CD", "CC", "CH"].includes(region.code))
			throw new Error("Special codes belong in reference-only content");
		if (
			provinceGroups.has(region.province) &&
			provinceGroups.get(region.province) !== region.group
		)
			throw new Error("A primary province cannot belong to multiple groups");
		provinceGroups.set(region.province, region.group);
		unique(
			region.areas.map((membership) => membership.areaId),
			`area IDs in ${region.code}`
		);
		if (region.areas.some((membership) => !areaIds.has(membership.areaId)))
			throw new Error(`${region.code}: unknown area`);
		if (region.facts.some((fact) => !factIds.has(fact)))
			throw new Error(`${region.code}: unknown fact`);
	}
	return content;
}

export function regionAreas(content: Content, region: Region) {
	return region.areas.map((membership) => {
		const area = content.areas.find((area) => area.id === membership.areaId);
		if (!area) throw new Error(`${region.code}: unknown area ${membership.areaId}`);
		return { area, confidence: membership.confidence };
	});
}

// Only high memberships may be asked, accepted or used as distractors (SRD 5.1, TRD 4.1).
export function memberAreas(content: Content, region: Region): Area[] {
	return regionAreas(content, region)
		.filter((membership) => membership.confidence === "high")
		.map((membership) => membership.area);
}

export function areaDisplayName(area: Area): string {
	return `${area.type === "kota" ? "Kota" : "Kabupaten"} ${area.name}`;
}

const eligibleRegion = (content: Content, region: Region) =>
	region.confidence === "high" && memberAreas(content, region).length > 0;

export function inScope(region: Region, scope: Scope): boolean {
	return scope.level === "national" || region[scope.level] === scope.id;
}

export type ScopeNode = Scope & { parent: string | null; regionIds: string[]; count: number };
export function buildHierarchy(content: Content): ScopeNode[] {
	const nodes = new Map<string, ScopeNode>();
	const add = (level: Scope["level"], id: string, parent: string | null, regionId: string) => {
		const key = `${level}:${id}`;
		const node = nodes.get(key) ?? { level, id, parent, regionIds: [], count: 0 };
		node.regionIds.push(regionId);
		node.count++;
		nodes.set(key, node);
	};
	for (const region of content.regions) {
		add("national", "indonesia", null, region.id);
		add("group", region.group, "national:indonesia", region.id);
		add("province", region.province, `group:${region.group}`, region.id);
	}
	return [...nodes.values()];
}

export function newCard(regionId: string, mode: CardMode, now: number): CardProgress {
	return {
		cardId: `${regionId}::${mode}`,
		regionId,
		mode,
		state: "new",
		stability: 0,
		difficulty: 0,
		interval: 0,
		due: now,
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
}

export function cardEligible(card: CardProgress, content: Content): boolean {
	const region = content.regions.find((region) => region.id === card.regionId);
	return Boolean(
		region &&
		eligibleRegion(content, region) &&
		(card.mode !== "setrecall" || memberAreas(content, region).length >= SET_MIN_AREAS)
	);
}

export function reconcileContent(input: Progress, value: unknown): Progress {
	const content = parseContent(value);
	const progress = structuredClone(input);
	for (const region of content.regions) {
		if (progress.knownRegions[region.id] && progress.knownRegions[region.id] !== region.code)
			throw new Error(`Stable ID reused: ${region.id}`);
		progress.knownRegions[region.id] = region.code;
	}
	for (const card of progress.cards) {
		const eligible = cardEligible(card, content);
		if (!eligible && card.state !== "suspended") {
			const region = content.regions.find((item) => item.id === card.regionId);
			const lacksAreas =
				card.mode === "setrecall" && region && eligibleRegion(content, region);
			card.resumeState = card.state;
			card.state = "suspended";
			card.suspensionReason = region && !lacksAreas ? "confidence" : "missing-data";
			progress.notices.push(`${card.cardId}: ${card.suspensionReason}`);
		} else if (
			eligible &&
			card.state === "suspended" &&
			(card.suspensionReason === "confidence" || card.suspensionReason === "missing-data")
		) {
			// SRD 7: data-driven suspensions end when the data is valid again, with history intact.
			card.state = card.resumeState ?? (card.stability > 0 ? "review" : "new");
			card.suspensionReason = null;
			card.resumeState = null;
		}
	}
	for (const region of content.regions.filter((region) => eligibleRegion(content, region))) {
		const add = (mode: CardMode) => {
			const card = newCard(region.id, mode, progress.clock.lastSeen);
			if (
				progress.reviews.some(
					(review) =>
						review.regionId === region.id &&
						review.scheduled &&
						review.day === progress.clock.sequence
				)
			)
				card.due = progress.clock.nextBoundary;
			if (!progress.cards.some((existing) => existing.cardId === card.cardId))
				progress.cards.push(card);
		};
		add("code2region");
		const primary = progress.cards.find((card) => card.cardId === `${region.id}::code2region`)!;
		if (primary.interval >= 7 && primary.state !== "suspended") add("region2code");
		if (
			primary.interval >= 14 &&
			primary.state !== "suspended" &&
			memberAreas(content, region).length >= SET_MIN_AREAS
		)
			add("setrecall");
	}
	if (
		!buildHierarchy(content).some(
			(node) =>
				node.level === progress.activeScope.level && node.id === progress.activeScope.id
		)
	)
		progress.activeScope = { level: "national", id: "indonesia" };
	if (
		progress.contentVersion !== content.version ||
		progress.contentRevision !== String(content.contentRev)
	) {
		progress.currentQuestion = null;
		progress.undo = null;
	}
	progress.contentVersion = content.version;
	progress.contentRevision = String(content.contentRev);
	return progress;
}

export function createProgress(content: Content, now: number, timezone?: string): Progress {
	const activeScope: Scope = { level: "national", id: "indonesia" };
	return reconcileContent(
		{
			schemaVersion: 1,
			contentVersion: content.version,
			contentRevision: String(content.contentRev),
			activeScope,
			clock: createClock(now, timezone),
			newCardsToday: [],
			newPaused: false,
			cards: [],
			reviews: [],
			confusions: [],
			sessions: [],
			challengeDays: [],
			bestScores: {},
			notices: [],
			lastBackupAt: null,
			storagePersistent: null,
			currentQuestion: null,
			knownRegions: {},
			undo: null
		},
		content
	);
}

type LegacyCore = {
	activeScope?: { level: string; id: string };
	cards?: { cardId: string; suffixId?: string }[];
	reviews?: { cardId: string }[];
	sessions?: { scope: { level: string; id: string }; cardIds: string[] }[];
	newCardsToday?: string[];
	currentQuestion?: { cardId: string; format?: string; answerKind?: string } | null;
	undo?: { before: LegacyCore } | null;
};
// blindrecall merged into code2region: its timed form is now a plain Level 3 question (TRD 4.1).
const legacyCard = (cardId: string) => /::(?:platfull|suffix|blindrecall)(?:::|$)/.test(cardId);
const legacyScope = (scope: { level: string; id: string }) =>
	scope.level === "code" ? { level: "national", id: "indonesia" } : scope;

// Stored data from before the plate/suffix/fact/blindrecall modes, partial-hint formats and the code scope were removed.
function dropLegacy(core: LegacyCore): boolean {
	const before = JSON.stringify(core);
	core.cards = core.cards?.filter((card) => !legacyCard(card.cardId));
	for (const card of core.cards ?? []) delete card.suffixId;
	core.reviews = core.reviews?.filter((review) => !legacyCard(review.cardId));
	core.newCardsToday = core.newCardsToday?.filter((cardId) => !legacyCard(cardId));
	for (const session of core.sessions ?? []) {
		session.cardIds = session.cardIds.filter((cardId) => !legacyCard(cardId));
		session.scope = legacyScope(session.scope);
	}
	if (core.activeScope) core.activeScope = legacyScope(core.activeScope);
	const question = core.currentQuestion;
	if (
		question &&
		(legacyCard(question.cardId) ||
			["fact", "plate", "suffix", "group", "first-letter"].includes(question.format ?? "") ||
			question.answerKind === "plate")
	)
		core.currentQuestion = null;
	return JSON.stringify(core) !== before;
}

function migrateProgress(value: unknown): unknown {
	if (!value || typeof value !== "object") return value;
	const progress = structuredClone(value) as LegacyCore;
	const changed = dropLegacy(progress);
	if (progress.undo && (dropLegacy(progress.undo.before) || changed)) progress.undo = null;
	return progress;
}

export function parseProgress(value: unknown): Progress {
	const progress = progressSchema.parse(migrateProgress(value));
	unique(
		progress.cards.map((card) => card.cardId),
		"card IDs"
	);
	unique(
		progress.reviews.map((review) => review.id),
		"review IDs"
	);
	unique(
		progress.sessions.map((session) => session.id),
		"session IDs"
	);
	unique(progress.newCardsToday, "daily introductions");
	if (progress.newCardsToday.length > 10) throw new Error("Daily new-card quota exceeded");
	const cards = new Set(progress.cards.map((card) => card.cardId));
	const sessions = new Set(progress.sessions.map((session) => session.id));
	for (const card of progress.cards) {
		if (card.cardId !== newCard(card.regionId, card.mode, 0).cardId)
			throw new Error("Invalid card identity");
		if (card.state === "mature" && (card.interval < 21 || !card.passedLevels.includes(3)))
			throw new Error("Invalid mature card");
	}
	if (progress.reviews.some((review) => !cards.has(review.cardId)))
		throw new Error("Review refers to missing card");
	if (
		progress.reviews.some(
			(review) =>
				!sessions.has(review.sessionId) ||
				(review.msToFirstKey !== null && review.msToFirstKey > review.elapsedMs)
		)
	)
		throw new Error("Invalid review session or timing");
	if (progress.currentQuestion && !cards.has(progress.currentQuestion.cardId))
		throw new Error("Question refers to missing card");
	if (progress.undo && progress.reviews.at(-1)?.id !== progress.undo.reviewId)
		throw new Error("Invalid undo snapshot");
	if (progress.undo) parseProgress({ ...progress.undo.before, undo: null });
	return progress;
}
