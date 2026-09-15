import { buildHierarchy, inScope } from "./content";
import { normalizeName, percentile } from "./grading";
import { addDays, createClock } from "./time";
import { type Content, type Level, type Progress, type RawReview, type Scope } from "./model";

export function answerStats(reviews: RawReview[]) {
	const samples = reviews.flatMap((review) =>
		review.msToFirstKey === null ? [] : [review.msToFirstKey]
	);
	const mature = reviews.filter((review) => review.wasMature && review.scheduled);
	return {
		answered: reviews.length,
		correct: reviews.filter((review) => review.correct).length,
		accuracy: reviews.length
			? reviews.filter((review) => review.correct).length / reviews.length
			: null,
		avgMs: samples.length
			? samples.reduce((sum, value) => sum + value, 0) / samples.length
			: null,
		medianMs: samples.length ? percentile(samples, 0.5) : null,
		matureRetention: mature.length
			? mature.filter((review) => review.correct).length / mature.length
			: null
	};
}

export function scopeStats(progress: Progress, content: Content, scope: Scope) {
	const ids = new Set(
		content.regions.filter((region) => inScope(region, scope)).map((region) => region.id)
	);
	const cards = progress.cards.filter((card) => ids.has(card.regionId));
	const reviews = progress.reviews.filter((review) => ids.has(review.regionId));
	const mature = cards.filter((card) => card.state === "mature").length;
	const confusions = progress.confusions.filter(
		(pair) => pair.active && pair.pair.some((id) => ids.has(id))
	);
	return {
		...answerStats(reviews),
		totalCards: cards.length,
		matureCards: mature,
		mastery: cards.length ? mature / cards.length : 0,
		mastered: cards.length > 0 && mature === cards.length && confusions.length === 0,
		confusions,
		newCards: cards.filter((card) => card.state === "new").length,
		suspendedCards: cards.filter((card) => card.state === "suspended").length,
		levels: ([1, 2, 3] as Level[]).map((level) => ({
			level,
			passed: cards.filter((card) => card.passedLevels.includes(level)).length,
			total: cards.length,
			...answerStats(reviews.filter((review) => review.level === level))
		}))
	};
}

export function weakCards(progress: Progress) {
	return progress.cards
		.map((card) => ({
			card,
			...answerStats(progress.reviews.filter((review) => review.cardId === card.cardId))
		}))
		.filter((item) => item.answered > 0)
		.sort((a, b) => a.accuracy! - b.accuracy! || b.answered - a.answered);
}

export function forecast(progress: Progress, content: Content, now: number) {
	const start = createClock(now, progress.clock.timezone).day;
	const groups = [...new Set(content.regions.map((region) => region.group))];
	const result = Array.from({ length: 14 }, (_, index) => ({
		day: addDays(start, index),
		groups: Object.fromEntries(groups.map((group) => [group, 0]))
	}));
	for (const card of progress.cards) {
		if (card.state === "new" || card.state === "suspended") continue;
		const region = content.regions.find((region) => region.id === card.regionId);
		if (!region) continue;
		const due = createClock(Math.max(now, card.due), progress.clock.timezone).day;
		const day = result.find((day) => day.day === due);
		if (day) day.groups[region.group]++;
	}
	return result;
}

export function challengeStreak(progress: Progress) {
	const days = [...new Set(progress.challengeDays)].sort((a, b) => a - b);
	let streak = 0;
	let previous: number | null = null;
	let lastGrace: number | null = null;
	const graceDays: number[] = [];
	for (const day of days) {
		if (previous === null || day - previous > 2) streak = 1;
		else if (day - previous === 1) streak++;
		else if (lastGrace === null || day - 1 - lastGrace >= 30) {
			lastGrace = day - 1;
			graceDays.push(lastGrace);
			streak++;
		} else streak = 1;
		previous = day;
	}
	const gap = previous === null ? Infinity : progress.clock.sequence - previous;
	if (
		gap > 2 ||
		(gap === 2 && lastGrace !== null && progress.clock.sequence - 1 - lastGrace < 30)
	)
		streak = 0;
	return {
		streak,
		graceDays,
		graceAvailable: lastGrace === null || progress.clock.sequence - lastGrace >= 30,
		completedToday: days.includes(progress.clock.sequence)
	};
}

export function searchReference(
	content: Content,
	query: string,
	scope: Scope = { level: "national", id: "indonesia" }
) {
	const needle = normalizeName(query, false);
	return {
		regions: content.regions.filter(
			(region) =>
				inScope(region, scope) &&
				[
					region.code,
					region.region,
					...region.aliases,
					...region.areas.flatMap((area) => [area.name, ...area.aliases])
				].some((name) => normalizeName(name, false).includes(needle))
		),
		specialCodes:
			scope.level === "national"
				? content.specialCodes.filter((entry) =>
						normalizeName(`${entry.code} ${entry.description}`, false).includes(needle)
					)
				: []
	};
}

export function masteryMap(progress: Progress, content: Content) {
	return buildHierarchy(content).map((scope) => ({
		level: scope.level,
		id: scope.id,
		...scopeStats(progress, content, scope)
	}));
}

export function sessionSummary(progress: Progress, content: Content, sessionId: string) {
	const session = progress.sessions.find((session) => session.id === sessionId);
	if (!session) throw new Error("Session not found");
	const reviews = progress.reviews.filter((review) => review.sessionId === sessionId);
	const scope = scopeStats(progress, content, session.scope);
	return {
		...answerStats(reviews),
		session,
		confusions: progress.confusions.filter(
			(pair) =>
				pair.active && pair.activatedAt !== null && pair.activatedAt >= session.startedAt
		),
		scope,
		masteryChange: session.mode === "focused" ? null : scope.mastery - session.masteryBefore,
		backupOverdue:
			progress.lastBackupAt === null ||
			progress.clock.lastSeen - progress.lastBackupAt > 14 * 86_400_000
	};
}

export function factContext(progress: Progress, content: Content, cardId: string) {
	const card = progress.cards.find((card) => card.cardId === cardId);
	if (!card) throw new Error("Card not found");
	const region = content.regions.find((region) => region.id === card.regionId);
	const facts = content.facts.filter((fact) => region?.facts.includes(fact.id));
	return {
		beforeQuestion: card.lapses >= 6 ? facts.slice(0, 1) : [],
		afterAnswer: facts.slice(0, 2),
		additional: card.state === "mature" ? facts.slice(2) : [],
		spans: region?.spans ?? []
	};
}
