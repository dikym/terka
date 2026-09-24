import {
	contentSchema,
	progressSchema,
	type CardMode,
	type CardProgress,
	type Content,
	type Progress,
	type Region,
	type Scope
} from "./model";
import { createClock } from "./time";

function unique(values: string[], label: string) {
	if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
}

export function verified(entry: {
	confidence: string;
	sources: Region["sources"];
	issues: string[];
}): boolean {
	return (
		entry.confidence === "high" &&
		!entry.issues.length &&
		entry.sources.some((source) => source.official) &&
		new Set(entry.sources.map((source) => source.publisher)).size >= 2
	);
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
		content.facts.map((fact) => fact.id),
		"fact IDs"
	);
	const factIds = new Set(content.facts.map((fact) => fact.id));
	const provinceGroups = new Map<string, string>();
	for (const region of content.regions) {
		if (["RI", "CD", "CC"].includes(region.code))
			throw new Error("Special codes belong in reference-only content");
		if (
			provinceGroups.has(region.province) &&
			provinceGroups.get(region.province) !== region.group
		)
			throw new Error("A primary province cannot belong to multiple groups");
		provinceGroups.set(region.province, region.group);
		unique(
			region.areas.map((area) => area.id),
			`area IDs in ${region.code}`
		);
		if (region.confidence === "high" && !verified(region))
			throw new Error(
				`${region.code}: high confidence requires independent sources, an official source and no conflicts`
			);
		if (region.facts.some((fact) => !factIds.has(fact)))
			throw new Error(`${region.code}: unknown fact`);
	}
	return content;
}

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
		suspensionReason: null
	};
}

export function cardEligible(card: CardProgress, content: Content): boolean {
	const region = content.regions.find((region) => region.id === card.regionId);
	return Boolean(region && verified(region));
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
		if (!cardEligible(card, content) && card.state !== "suspended") {
			card.state = "suspended";
			card.suspensionReason = content.regions.some((region) => region.id === card.regionId)
				? "confidence"
				: "missing-data";
			progress.notices.push(`${card.cardId}: ${card.suspensionReason}`);
		}
	}
	for (const region of content.regions.filter(verified)) {
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
		add("blindrecall");
		const primary = progress.cards.find((card) => card.cardId === `${region.id}::code2region`)!;
		if (primary.interval >= 7 && primary.state !== "suspended") add("region2code");
		if (primary.interval >= 14 && primary.state !== "suspended") add("setrecall");
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
		progress.contentRevision !== content.sourceRevision
	) {
		progress.currentQuestion = null;
		progress.undo = null;
	}
	progress.contentVersion = content.version;
	progress.contentRevision = content.sourceRevision;
	return progress;
}

export function createProgress(content: Content, now: number, timezone?: string): Progress {
	const activeScope: Scope = { level: "national", id: "indonesia" };
	return reconcileContent(
		{
			schemaVersion: 1,
			contentVersion: content.version,
			contentRevision: content.sourceRevision,
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
const legacyCard = (cardId: string) => /::(?:platfull|suffix)(?:::|$)/.test(cardId);
const legacyScope = (scope: { level: string; id: string }) =>
	scope.level === "code" ? { level: "national", id: "indonesia" } : scope;

// Stored data from before the plate/suffix/fact modes and the code scope were removed.
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
			["fact", "plate", "suffix"].includes(question.format ?? "") ||
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
