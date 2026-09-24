import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const timestamp = z.number().finite().nonnegative();
const count = z.number().int().nonnegative();
export const levelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const scopeSchema = z.object({
	level: z.enum(["national", "group", "province"]),
	id: z.string().min(1)
});
const sourceSchema = z.object({
	ref: z.string().min(1),
	publisher: z.string().min(1),
	official: z.boolean()
});
const confidenceSchema = z.enum(["high", "medium", "low"]);
export const areaSchema = z.object({
	id,
	name: z.string().min(1),
	aliases: z.array(z.string().min(1))
});
export const regionSchema = z.object({
	id,
	code: z.string().regex(/^[A-Z]{1,2}$/),
	region: z.string().min(1),
	group: id,
	province: id,
	spans: z.array(id),
	confidence: confidenceSchema,
	aliases: z.array(z.string().min(1)),
	areas: z.array(areaSchema).min(1),
	facts: z.array(id),
	sources: z.array(sourceSchema),
	issues: z.array(z.string()),
	sourceText: z.string().min(1)
});
export const contentSchema = z.object({
	version: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	sourceRevision: z.string().min(1),
	regions: z.array(regionSchema).min(1),
	facts: z.array(
		z.object({
			id,
			status: z.enum(["terverifikasi", "diperdebatkan", "legenda"]),
			text: z.string().min(1),
			source: z.string().min(1)
		})
	),
	specialCodes: z.array(z.object({ code: z.string().min(1), description: z.string().min(1) }))
});
export const modeSchema = z.enum(["code2region", "region2code", "blindrecall", "setrecall"]);
export const cardSchema = z.object({
	cardId: z.string().min(1),
	regionId: id,
	mode: modeSchema,
	state: z.enum(["new", "learning", "review", "relearning", "mature", "suspended"]),
	stability: z.number().finite().nonnegative(),
	difficulty: z.number().finite().min(0).max(10),
	interval: z.number().finite().nonnegative(),
	due: timestamp,
	reps: count,
	lapses: count,
	step: count.max(2),
	lastReview: timestamp.nullable(),
	scheduledDay: count.nullable(),
	pendingDue: timestamp.nullable(),
	passedLevels: z.array(levelSchema),
	suspensionReason: z.enum(["manual", "missing-data", "confidence", "leech"]).nullable()
});
export const clockSchema = z.object({
	day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	sequence: count,
	timezone: z.string().min(1),
	nextBoundary: timestamp,
	lastSeen: timestamp
});
export const sessionModeSchema = z.enum(["daily", "focused", "set", "challenge", "sprint"]);
export const reviewSchema = z.object({
	id: z.string().min(1),
	questionId: z.string().min(1),
	contentVersion: z.string().min(1),
	cardId: z.string().min(1),
	regionId: id,
	sessionId: z.string().min(1),
	mode: sessionModeSchema,
	ts: timestamp,
	day: count,
	level: levelSchema,
	autoLevel: levelSchema,
	correct: z.boolean(),
	fuzzy: z.boolean(),
	timedOut: z.boolean(),
	msToFirstKey: timestamp.nullable(),
	elapsedMs: timestamp,
	answers: z.array(z.string()),
	confusedWith: z.array(id),
	setCorrect: count.nullable(),
	setTarget: count.positive().nullable(),
	drillPair: z.tuple([id, id]).nullable(),
	scheduled: z.boolean(),
	wasMature: z.boolean()
});
export const confusionSchema = z.object({
	pair: z.tuple([id, id]),
	events: z.array(timestamp),
	active: z.boolean(),
	activatedAt: timestamp.nullable(),
	streak: count,
	resolvedAt: timestamp.nullable(),
	lastSeen: timestamp
});
export const sessionSchema = z.object({
	id: z.string().min(1),
	mode: sessionModeSchema,
	scope: scopeSchema,
	startedAt: timestamp,
	day: count,
	cardIds: z.array(z.string()),
	answered: count,
	correct: count,
	masteryBefore: z.number().min(0).max(1),
	completedAt: timestamp.nullable()
});
export const questionSchema = z.object({
	id: z.string().min(1),
	cardId: z.string().min(1),
	regionId: id,
	level: levelSchema,
	autoLevel: levelSchema,
	format: z.enum([
		"choice",
		"truefalse",
		"not-in",
		"recall",
		"set",
		"drill",
		"group",
		"first-letter"
	]),
	prompt: z.string().min(1),
	choices: z.array(z.string()),
	targets: z
		.array(z.object({ id: z.string(), name: z.string(), aliases: z.array(z.string()) }))
		.min(1),
	answerKind: z.enum(["name", "code", "literal", "set"]),
	setTarget: count.positive().nullable(),
	limitMs: timestamp.positive().nullable(),
	drillPair: z.tuple([id, id]).nullable(),
	context: z.array(z.string()),
	facts: z.array(z.string()),
	shownAt: timestamp
});
const coreSchema = z.object({
	schemaVersion: z.literal(1),
	contentVersion: z.string().min(1),
	contentRevision: z.string().min(1),
	activeScope: scopeSchema,
	clock: clockSchema,
	newCardsToday: z.array(z.string()),
	newPaused: z.boolean(),
	cards: z.array(cardSchema),
	reviews: z.array(reviewSchema),
	confusions: z.array(confusionSchema),
	sessions: z.array(sessionSchema),
	challengeDays: z.array(count),
	bestScores: z.record(count),
	notices: z.array(z.string()),
	lastBackupAt: timestamp.nullable(),
	storagePersistent: z.boolean().nullable(),
	currentQuestion: questionSchema.nullable(),
	knownRegions: z.record(z.string().min(1))
});
export const progressSchema = coreSchema.extend({
	undo: z.object({ reviewId: z.string(), before: coreSchema }).nullable()
});
export type Content = z.infer<typeof contentSchema>;
export type Region = Content["regions"][number];
export type Area = z.infer<typeof areaSchema>;
export type Scope = z.infer<typeof scopeSchema>;
export type Level = z.infer<typeof levelSchema>;
export type CardMode = z.infer<typeof modeSchema>;
export type CardProgress = z.infer<typeof cardSchema>;
export type LearningClock = z.infer<typeof clockSchema>;
export type RawReview = z.infer<typeof reviewSchema>;
export type SessionMode = z.infer<typeof sessionModeSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type Grade = 1 | 2 | 3 | 4;
export type Target = Question["targets"][number];
export const DAY = 86_400_000;
