import { z } from "zod";
import { buildHierarchy, cardEligible, inScope, newCard, reconcileContent } from "./content";
import { advanceClock } from "./time";
import {
	automaticLevel,
	evaluateQuestion,
	generateQuestion,
	questionTimedOut,
	shuffled
} from "./questions";
import { scheduleAnswer } from "./scheduler";
import { scopeStats } from "./statistics";
import {
	DAY,
	scopeSchema,
	sessionModeSchema,
	type Content,
	type Level,
	type Progress,
	type Question,
	type RawReview,
	type Scope,
	type Session
} from "./model";

export type QueueItem = { cardId: string; priority: 1 | 2 | 3 | 4; pair?: [string, string] };
const samePair = (a: string[], b: string[]) => a[0] === b[0] && a[1] === b[1];

export function dailyQueue(progress: Progress, content: Content, now: number): QueueItem[] {
	const day = progress.clock.sequence;
	const queue: QueueItem[] = [];
	const introduced = new Set(progress.newCardsToday);
	const seenRegions = new Map(
		progress.reviews
			.filter((review) => review.day === day && review.scheduled)
			.map((review) => [review.regionId, review.cardId])
	);
	const available = progress.cards.filter(
		(card) =>
			card.mode !== "setrecall" && card.state !== "suspended" && cardEligible(card, content)
	);
	const chosenRegions = new Set<string>();
	for (const card of [...available]
		.filter((card) => card.state !== "new" && card.due <= now)
		.sort(
			(a, b) =>
				Number(b.state === "relearning") - Number(a.state === "relearning") ||
				a.interval - b.interval ||
				Number(a.mode === "region2code") - Number(b.mode === "region2code") ||
				a.cardId.localeCompare(b.cardId)
		)) {
		const steps = card.state === "learning" || card.state === "relearning";
		if (
			(!steps && card.scheduledDay === day) ||
			(seenRegions.has(card.regionId) && seenRegions.get(card.regionId) !== card.cardId) ||
			chosenRegions.has(card.regionId)
		)
			continue;
		queue.push({ cardId: card.cardId, priority: card.state === "relearning" ? 1 : 3 });
		chosenRegions.add(card.regionId);
	}
	for (const confusion of progress.confusions.filter((pair) => pair.active)) {
		const card = available.find(
			(card) => card.regionId === confusion.pair[0] && card.mode === "code2region"
		);
		const other = content.regions.find((region) => region.id === confusion.pair[1]);
		if (!card || !other || !available.some((candidate) => candidate.regionId === other.id))
			continue;
		if (
			progress.reviews.some(
				(review) =>
					review.day === day &&
					review.drillPair &&
					samePair(review.drillPair, confusion.pair)
			)
		)
			continue;
		queue.push({ cardId: card.cardId, priority: 2, pair: confusion.pair });
	}
	const pause = progress.newPaused || queue.length > 40;
	if (!pause) {
		let remaining = Math.max(0, 10 - introduced.size);
		for (const card of available
			.filter((card) => card.state === "new" && card.due <= now)
			.sort(
				(a, b) =>
					Number(a.mode !== "code2region") - Number(b.mode !== "code2region") ||
					a.cardId.localeCompare(b.cardId)
			)) {
			const region = content.regions.find((region) => region.id === card.regionId)!;
			if (
				!remaining ||
				!inScope(region, progress.activeScope) ||
				seenRegions.has(card.regionId) ||
				chosenRegions.has(card.regionId)
			)
				continue;
			queue.push({ cardId: card.cardId, priority: 4 });
			chosenRegions.add(card.regionId);
			remaining--;
		}
	}
	return queue.sort((a, b) => a.priority - b.priority);
}

// Learning steps can come due again before the day ends, so the daily queue may reopen early.
export function nextDailyAt(progress: Progress, content: Content, now: number): number {
	return Math.min(
		progress.clock.nextBoundary,
		...progress.cards
			.filter(
				(card) =>
					card.mode !== "setrecall" &&
					(card.state === "learning" || card.state === "relearning") &&
					card.due > now &&
					cardEligible(card, content)
			)
			.map((card) => card.due)
	);
}

export function refreshProgress(
	input: Progress,
	content: Content,
	now: number,
	timezone = input.clock.timezone
): Progress {
	const progress = structuredClone(input);
	const previous = progress.clock.sequence;
	progress.clock = advanceClock(progress.clock, now, timezone);
	const delay = progress.clock.nextBoundary - input.clock.nextBoundary;
	if (timezone !== input.clock.timezone && delay > 0 && previous === progress.clock.sequence) {
		for (const card of [...progress.cards, ...(progress.undo?.before.cards ?? [])]) {
			if (card.due > now && card.state !== "learning" && card.state !== "relearning")
				card.due += delay;
			if (card.pendingDue !== null && card.pendingDue > now) card.pendingDue += delay;
		}
	}
	if (progress.clock.sequence !== previous) {
		progress.newCardsToday = [];
		progress.newPaused = false;
	}
	const queue = dailyQueue(progress, content, now);
	if (queue.filter((item) => item.priority < 4).length > 40) progress.newPaused = true;
	// Keep the deferred sibling due at the next protected day, not hidden indefinitely.
	const chosen = new Set(queue.filter((item) => !item.pair).map((item) => item.cardId));
	const seen = progress.reviews.filter(
		(review) => review.day === progress.clock.sequence && review.scheduled
	);
	for (const card of progress.cards) {
		if (
			card.mode === "setrecall" ||
			card.state === "new" ||
			card.state === "suspended" ||
			card.due > now ||
			chosen.has(card.cardId)
		)
			continue;
		if (
			seen.some(
				(review) => review.regionId === card.regionId && review.cardId !== card.cardId
			)
		)
			card.due = Math.max(card.due, progress.clock.nextBoundary);
	}
	return progress;
}

export function selectScope(input: Progress, content: Content, value: Scope): Progress {
	const scope = scopeSchema.parse(value);
	if (!buildHierarchy(content).some((node) => node.level === scope.level && node.id === scope.id))
		throw new Error("Unknown scope");
	return { ...input, activeScope: scope };
}

export function learnedCards(progress: Progress, content: Content, includeNew = false) {
	return progress.cards.filter(
		(card) =>
			(card.reps > 0 || includeNew) &&
			card.state !== "suspended" &&
			card.mode !== "setrecall" &&
			cardEligible(card, content)
	);
}

export function startSession(
	input: Progress,
	content: Content,
	options: {
		id: string;
		mode: Session["mode"];
		scope?: Scope;
		now: number;
		timezone?: string;
		random?: () => number;
	}
): Progress {
	const mode = sessionModeSchema.parse(options.mode);
	if (!options.id.trim()) throw new Error("Session ID is required");
	let progress = refreshProgress(input, content, options.now, options.timezone);
	const existing = progress.sessions.find((session) => session.id === options.id);
	if (existing) return progress;
	for (const session of progress.sessions.filter((session) => session.completedAt === null)) {
		if (
			(session.mode === "sprint" && options.now >= session.startedAt + 60_000) ||
			(session.mode === "challenge" && session.day < progress.clock.sequence)
		) {
			session.completedAt = options.now;
			if (session.mode === "sprint") {
				const key = `${session.scope.level}:${session.scope.id}`;
				progress.bestScores[key] = Math.max(progress.bestScores[key] ?? 0, session.correct);
			}
		} else throw new Error("Finish or resume the current session first");
	}
	const scope = options.scope ?? progress.activeScope;
	selectScope(progress, content, scope);
	const learned = learnedCards(progress, content, mode === "sprint");
	let cardIds: string[];
	if (mode === "daily") cardIds = [];
	else if (mode === "challenge") {
		if (progress.challengeDays.includes(progress.clock.sequence))
			throw new Error("Daily challenge already completed");
		if (
			progress.sessions.some(
				(session) => session.mode === "challenge" && session.day === progress.clock.sequence
			)
		)
			throw new Error("Resume today's challenge");
		const choices = shuffled(learned, options.random ?? Math.random);
		if (!choices.length) throw new Error("No learned cards available");
		cardIds = Array.from({ length: 5 }, (_, index) => choices[index % choices.length].cardId);
	} else if (mode === "set")
		cardIds = progress.cards
			.filter(
				(card) =>
					card.mode === "setrecall" &&
					card.state !== "suspended" &&
					card.due <= options.now &&
					cardEligible(card, content) &&
					inScope(
						content.regions.find((region) => region.id === card.regionId)!,
						scope
					)
			)
			.map((card) => card.cardId);
	else
		cardIds = shuffled(
			learned.filter((card) =>
				inScope(
					content.regions.find((region) => region.id === card.regionId)!,
					scope
				)
			),
			options.random ?? Math.random
		).map((card) => card.cardId);
	if (mode !== "daily" && !cardIds.length) throw new Error("No cards available in this scope");
	progress = { ...progress, currentQuestion: null };
	progress.sessions.push({
		id: options.id,
		mode,
		scope: mode === "challenge" ? { level: "national", id: "indonesia" } : scope,
		startedAt: options.now,
		day: progress.clock.sequence,
		cardIds,
		answered: 0,
		correct: 0,
		masteryBefore: scopeStats(
			progress,
			content,
			mode === "challenge" ? { level: "national", id: "indonesia" } : scope
		).mastery,
		completedAt: null
	});
	return progress;
}

function activeSession(progress: Progress): Session {
	const session = progress.sessions.findLast((session) => session.completedAt === null);
	if (!session) throw new Error("Start a session first");
	return session;
}

export function nextQuestion(
	input: Progress,
	content: Content,
	options: {
		id: string;
		now: number;
		level?: Level;
		format?: Question["format"];
		random?: () => number;
	}
): Progress {
	const progress = refreshProgress(input, content, options.now);
	const session = activeSession(progress);
	if (session.mode === "sprint" && options.now >= session.startedAt + 60_000)
		return finishSession(progress, options.now);
	if (session.mode === "challenge" && session.day !== progress.clock.sequence)
		throw new Error("Challenge expired at the day boundary");
	if (progress.currentQuestion) {
		const question = progress.currentQuestion;
		if (options.level !== undefined && options.level !== question.level) {
			if (session.mode === "sprint" || question.drillPair)
				throw new Error("This mode has a fixed difficulty level");
			const card = progress.cards.find((card) => card.cardId === question.cardId)!;
			progress.currentQuestion = generateQuestion(content, card, options);
		}
		return progress;
	}
	let item: QueueItem | undefined;
	if (session.mode === "daily") item = dailyQueue(progress, content, options.now)[0];
	else {
		const cardId =
			session.cardIds[
				session.mode === "sprint"
					? session.answered % session.cardIds.length
					: session.answered
			];
		if (cardId) item = { cardId, priority: 3 };
	}
	if (!item) return progress;
	const card = progress.cards.find((card) => card.cardId === item.cardId);
	if (!card || card.state === "suspended" || !cardEligible(card, content))
		throw new Error("Card is no longer available");
	progress.currentQuestion = generateQuestion(content, card, {
		...options,
		level: session.mode === "sprint" ? 1 : options.level,
		pair: item.pair
	});
	return progress;
}

const submissionSchema = z
	.object({
		id: z.string().min(1),
		sessionId: z.string().min(1),
		questionId: z.string().min(1),
		now: z.number().finite().nonnegative(),
		msToFirstKey: z.number().finite().nonnegative().nullable(),
		answers: z.array(z.string().max(500)).max(200)
	})
	.strict();
export type Submission = z.infer<typeof submissionSchema>;

function recordConfusions(progress: Progress, review: RawReview) {
	for (const other of review.confusedWith) {
		let confusion = progress.confusions.find((entry) =>
			samePair(entry.pair, [review.regionId, other])
		);
		if (!confusion) {
			confusion = {
				pair: [review.regionId, other],
				events: [],
				active: false,
				activatedAt: null,
				streak: 0,
				resolvedAt: null,
				lastSeen: review.ts
			};
			progress.confusions.push(confusion);
		}
		confusion.events = [
			...confusion.events.filter(
				(event) =>
					event >= review.ts - 30 * DAY &&
					(confusion.resolvedAt === null || event > confusion.resolvedAt)
			),
			review.ts
		];
		confusion.lastSeen = review.ts;
		confusion.streak = 0;
		if (
			!confusion.active &&
			confusion.events.length >= (confusion.resolvedAt === null ? 3 : 2)
		) {
			confusion.active = true;
			confusion.activatedAt = review.ts;
		}
	}
	if (review.drillPair) {
		const confusion = progress.confusions.find((entry) =>
			samePair(entry.pair, review.drillPair!)
		);
		if (confusion) {
			confusion.streak = review.correct && !review.timedOut ? confusion.streak + 1 : 0;
			if (confusion.streak >= 5) {
				confusion.active = false;
				confusion.resolvedAt = review.ts;
				confusion.events = [];
			}
		}
	}
}

export function applyAnswer(
	input: Progress,
	content: Content,
	value: Submission,
	random = Math.random
): Progress {
	const submission = submissionSchema.parse(value);
	const previous = input.reviews.find((review) => review.id === submission.id);
	if (previous) {
		if (
			previous.questionId !== submission.questionId ||
			previous.sessionId !== submission.sessionId ||
			previous.ts !== submission.now ||
			previous.msToFirstKey !== submission.msToFirstKey ||
			JSON.stringify(previous.answers) !== JSON.stringify(submission.answers)
		)
			throw new Error("Answer ID was reused with different data");
		return input;
	}
	let progress = refreshProgress(input, content, submission.now);
	const question = progress.currentQuestion;
	const session = activeSession(progress);
	if (!question || question.id !== submission.questionId || session.id !== submission.sessionId)
		throw new Error("Answer does not belong to the current question/session");
	if (submission.now < question.shownAt || submission.now < input.clock.lastSeen)
		throw new Error("Answer timestamp moved backwards");
	const elapsedMs = submission.now - question.shownAt;
	if (submission.msToFirstKey !== null && submission.msToFirstKey > elapsedMs)
		throw new Error("First key cannot occur after submission");
	if (session.mode === "challenge" && session.day !== progress.clock.sequence)
		throw new Error("Challenge expired");
	if (session.mode === "sprint" && submission.now > session.startedAt + 60_000)
		throw new Error("Sprint time is over");
	const card = progress.cards.find((card) => card.cardId === question.cardId)!;
	if (!card || card.state === "suspended" || !cardEligible(card, content))
		throw new Error("Card is unavailable");
	const result = evaluateQuestion(content, question, submission.answers);
	const timedOut = questionTimedOut(question, elapsedMs, submission.msToFirstKey);
	const lowerLevel = question.level < automaticLevel(card);
	const isStep = card.state === "learning" || card.state === "relearning";
	const siblingReviewed = progress.reviews.some(
		(review) =>
			review.scheduled &&
			review.day === progress.clock.sequence &&
			review.regionId === card.regionId &&
			review.cardId !== card.cardId
	);
	const isNew = card.state === "new";
	const mayIntroduce =
		isNew &&
		(session.mode === "daily" || session.mode === "set") &&
		!progress.newPaused &&
		progress.newCardsToday.length < 10 &&
		inScope(
			content.regions.find((region) => region.id === card.regionId)!,
			progress.activeScope
		);
	const scheduled =
		!lowerLevel &&
		session.mode !== "challenge" &&
		session.mode !== "sprint" &&
		!siblingReviewed &&
		(isNew ? mayIntroduce : card.due <= submission.now) &&
		(isStep || card.scheduledDay !== progress.clock.sequence);
	const review: RawReview = {
		id: submission.id,
		questionId: question.id,
		contentVersion: content.version,
		cardId: card.cardId,
		regionId: card.regionId,
		sessionId: session.id,
		mode: session.mode,
		ts: submission.now,
		day: progress.clock.sequence,
		level: question.level,
		autoLevel: question.autoLevel,
		correct: result.correct && !timedOut,
		fuzzy: result.fuzzy,
		timedOut,
		msToFirstKey: submission.msToFirstKey,
		elapsedMs,
		answers: submission.answers,
		confusedWith: result.confusedWith,
		setCorrect: result.setCorrect,
		setTarget: question.setTarget,
		drillPair: question.drillPair,
		scheduled,
		wasMature: card.state === "mature"
	};
	const { undo: previousUndo, ...before } = progress;
	void previousUndo;
	progress.undo = { reviewId: review.id, before: structuredClone(before) };
	if (scheduled) {
		progress.cards[progress.cards.indexOf(card)] = scheduleAnswer(
			card,
			review,
			progress.reviews,
			progress.clock,
			random
		);
		if (isNew) progress.newCardsToday.push(card.cardId);
	}
	const updatedCard = progress.cards.find((item) => item.cardId === card.cardId)!;
	if (review.correct && !updatedCard.passedLevels.includes(review.level))
		updatedCard.passedLevels.push(review.level);
	progress.reviews.push(review);
	recordConfusions(progress, review);
	session.answered++;
	if (review.correct) session.correct++;
	progress.currentQuestion = null;
	if (
		(session.mode === "challenge" && session.answered === 5) ||
		((session.mode === "focused" || session.mode === "set") &&
			session.answered >= session.cardIds.length)
	) {
		session.completedAt = submission.now;
		if (session.mode === "challenge") progress.challengeDays.push(progress.clock.sequence);
	}
	progress = reconcileContent(progress, content);
	return refreshProgress(progress, content, submission.now);
}

export function undoAnswer(input: Progress): Progress {
	if (!input.undo) throw new Error("There is no answer to undo");
	if (input.reviews.at(-1)?.id !== input.undo.reviewId)
		throw new Error("Only the last answer can be undone");
	const before = structuredClone(input.undo.before);
	return {
		...before,
		clock: input.clock,
		activeScope: input.activeScope,
		newCardsToday:
			input.clock.sequence === before.clock.sequence
				? before.newCardsToday
				: input.newCardsToday,
		newPaused:
			input.clock.sequence === before.clock.sequence ? before.newPaused : input.newPaused,
		lastBackupAt: input.lastBackupAt,
		storagePersistent: input.storagePersistent,
		undo: null
	};
}

export function finishSession(input: Progress, now: number): Progress {
	const progress = structuredClone(input);
	const session = activeSession(progress);
	if (!Number.isFinite(now) || now < Math.max(session.startedAt, input.clock.lastSeen))
		throw new Error("Invalid finish time");
	if (session.mode === "challenge" && session.answered < 5)
		throw new Error("Complete the five challenge questions or resume later");
	if (session.mode === "sprint" && now < session.startedAt + 60_000)
		throw new Error("Sprint lasts 60 seconds");
	session.completedAt = now;
	progress.clock = advanceClock(progress.clock, now);
	if (progress.clock.sequence !== input.clock.sequence) {
		progress.newCardsToday = [];
		progress.newPaused = false;
	}
	progress.currentQuestion = null;
	if (session.mode === "sprint") {
		const key = `${session.scope.level}:${session.scope.id}`;
		progress.bestScores[key] = Math.max(progress.bestScores[key] ?? 0, session.correct);
	}
	return progress;
}

export function setCardSuspended(
	input: Progress,
	content: Content,
	cardId: string,
	suspended: boolean,
	now: number
): Progress {
	const progress = structuredClone(input);
	const card = progress.cards.find((card) => card.cardId === cardId);
	if (!card) throw new Error("Card not found");
	if (!suspended && !cardEligible(card, content))
		throw new Error("Verify card content before reactivation");
	if (suspended) {
		card.state = "suspended";
		card.suspensionReason = "manual";
	} else Object.assign(card, newCard(card.regionId, card.mode, now));
	progress.currentQuestion = null;
	progress.undo = null;
	return progress;
}
