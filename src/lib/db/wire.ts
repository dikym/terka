import { z } from "zod";
import { contentIdSchema } from "@/core/content/schema";
import type {
	CardEvent,
	FactView,
	FsrsParams,
	PracticeRun,
	ReviewLog,
	ReviewVoid,
	Sighting
} from "@/core/log/events";
import { NOTE_MAX_CHARS } from "@/rules";
import {
	CARD_EVENT_KINDS,
	CARD_MODES,
	CONTEXTS,
	FSRS_ALGORITHMS,
	FSRS_STATUSES,
	INPUT_MODES,
	LEVEL_SOURCES,
	MATCH_TYPES,
	QUESTION_TYPES,
	RUN_KINDS,
	SCOPE_LEVELS,
	TIERS
} from "./enums";
import type { ConsentRow, DeviceRow, NoteRow, SettingsRow, TableName } from "./schema";

const oneOf = <T extends string>(values: Record<T, true>) =>
	z.enum(Object.keys(values) as [T, ...T[]]);

const uuid = z
	.string()
	.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const time = z.number().int();
const count = z.number().int().nonnegative();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// Counted in code points, like char_length on the server.
const text = (max: number) => z.string().refine((value) => [...value].length <= max);
const event = {
	id: uuid,
	deviceId: uuid,
	receivedAt: time.nullable(),
	serverSeq: z.number().int().positive().nullable()
};

const mode = oneOf(CARD_MODES);
const matchType = oneOf(MATCH_TYPES);
const scopeLevel = oneOf(SCOPE_LEVELS);

const reviewLog = z
	.object({
		...event,
		runId: uuid.nullable(),
		contentId: contentIdSchema,
		mode,
		context: oneOf(CONTEXTS),
		level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		levelSource: oneOf(LEVEL_SOURCES),
		correct: z.boolean().nullable(),
		timedOut: z.boolean(),
		msToFirstKey: count.nullable(),
		msTotal: count,
		msTyping: count.nullable(),
		keyGapsMs: z.array(count).nullable(),
		deletedChars: count,
		optionChanges: count,
		optionCount: count.nullable(),
		inputMode: oneOf(INPUT_MODES),
		interrupted: z.boolean(),
		rawAnswer: z.string().nullable(),
		matchType,
		typoCost: z.number().nonnegative(),
		acceptedAreaId: contentIdSchema.nullable(),
		promptAreaId: contentIdSchema.nullable(),
		answerRulesVersion: z.number().int().positive(),
		unknown: z.boolean(),
		confusedWith: contentIdSchema.nullable(),
		drillPairWith: contentIdSchema.nullable(),
		setCorrect: count.nullable(),
		setThreshold: count.nullable(),
		setItems: z
			.array(
				z.tuple([
					z.string(),
					contentIdSchema.nullable(),
					matchType,
					z.number().nonnegative(),
					contentIdSchema.nullable()
				])
			)
			.nullable(),
		questionType: oneOf(QUESTION_TYPES),
		contentVersion: z.number().int().positive(),
		engineVersion: z.number().int().positive(),
		clientTs: time,
		localDay: day,
		tz: z.string().min(1)
	})
	.strict() satisfies z.ZodType<ReviewLog>;

const reviewVoid = z
	.object({ ...event, reviewId: uuid, clientTs: time })
	.strict() satisfies z.ZodType<ReviewVoid>;

const cardEvent = z
	.object({
		...event,
		contentId: contentIdSchema,
		mode,
		kind: oneOf(CARD_EVENT_KINDS),
		clientTs: time,
		localDay: day
	})
	.strict() satisfies z.ZodType<CardEvent>;

const sighting = z
	.object({ ...event, regionId: contentIdSchema, clientTs: time, localDay: day })
	.strict() satisfies z.ZodType<Sighting>;

const factView = z
	.object({
		...event,
		factId: contentIdSchema,
		runId: uuid.nullable(),
		clientTs: time,
		localDay: day
	})
	.strict() satisfies z.ZodType<FactView>;

const fsrsParams = z
	.object({
		...event,
		algorithm: oneOf(FSRS_ALGORITHMS),
		libraryVersion: z.string().min(1),
		weights: z.array(z.number()),
		status: oneOf(FSRS_STATUSES),
		activatedAt: time.nullable(),
		trainedReviewCount: count,
		trainedThroughSeq: z.number().int().nullable(),
		trainingSetHash: z.string(),
		createdAt: time,
		logloss: z.number(),
		rmse: z.number(),
		baselineLogloss: z.number(),
		baselineRmse: z.number(),
		trainingEventIds: z.array(uuid).optional()
	})
	.strict() satisfies z.ZodType<FsrsParams>;

const practiceRun = z
	.object({
		...event,
		kind: oneOf(RUN_KINDS),
		scopeLevel,
		scopeId: contentIdSchema.nullable(),
		startedAt: time,
		localDay: day,
		endedAt: time.nullable(),
		answered: count.nullable(),
		correct: count.nullable(),
		activeMs: count.nullable(),
		score: count.nullable(),
		estimatedMs: count.nullable(),
		plannedCount: count.nullable(),
		placementLevel: oneOf(TIERS).nullable()
	})
	.strict() satisfies z.ZodType<PracticeRun>;

const device = z
	.object({
		id: uuid,
		label: text(40),
		platform: text(200),
		createdAt: time,
		lastSeenAt: time.nullable()
	})
	.strict() satisfies z.ZodType<DeviceRow>;

const consent = z
	.object({
		policyVersion: z.string().min(1),
		deviceId: uuid,
		consentedAt: time,
		receivedAt: time.nullable()
	})
	.strict() satisfies z.ZodType<ConsentRow>;

const settings = z
	.object({
		activeScopeLevel: scopeLevel,
		activeScopeId: contentIdSchema.nullable(),
		specialEnabled: z.boolean(),
		updatedAt: time,
		updatedByDevice: uuid,
		receivedAt: time.nullable()
	})
	.strict() satisfies z.ZodType<SettingsRow>;

const note = z
	.object({
		contentId: contentIdSchema,
		body: text(NOTE_MAX_CHARS),
		updatedAt: time,
		updatedByDevice: uuid,
		receivedAt: time.nullable()
	})
	.strict() satisfies z.ZodType<NoteRow>;

// Export order follows the server's foreign keys, so a reader sees referenced rows first.
export const ROW_SCHEMAS = {
	devices: device,
	privacy_consents: consent,
	user_settings: settings,
	practice_runs: practiceRun,
	review_logs: reviewLog,
	review_voids: reviewVoid,
	card_events: cardEvent,
	sightings: sighting,
	fact_views: factView,
	fsrs_params: fsrsParams,
	card_notes: note
} satisfies Record<TableName, z.ZodTypeAny>;

export const TABLES = Object.keys(ROW_SCHEMAS) as TableName[];
export const isTable = (name: string): name is TableName => name in ROW_SCHEMAS;

const TIME_KEYS = new Set([
	"receivedAt",
	"clientTs",
	"startedAt",
	"endedAt",
	"activatedAt",
	"createdAt",
	"updatedAt",
	"consentedAt",
	"lastSeenAt"
]);
const snake = (key: string) => key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
const camel = (key: string) => key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());

// Server shape: snake_case columns and ISO timestamps; everything else is copied unchanged.
export function toWire(row: object): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(row).map(([key, value]) => [
			snake(key),
			TIME_KEYS.has(key) && typeof value === "number" ? new Date(value).toISOString() : value
		])
	);
}

// Keys and times only; fromWire adds validation, pulled server rows skip it.
export function toLocal(row: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(row).map(([key, value]) => {
			const name = camel(key);
			return [
				name,
				TIME_KEYS.has(name) && typeof value === "string" ? Date.parse(value) : value
			];
		})
	);
}

export function fromWire(table: TableName, row: Record<string, unknown>) {
	return ROW_SCHEMAS[table].safeParse(toLocal(row));
}
