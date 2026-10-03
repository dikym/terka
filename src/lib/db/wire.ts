import { z } from "zod";
import { contentIdSchema } from "@/core/content/schema";
import type { MatchType } from "@/core/answers/match-name";
import type {
	CardEvent,
	FactView,
	FsrsParams,
	PracticeRun,
	ReviewLog,
	ReviewVoid,
	RunKind,
	Sighting
} from "@/core/log/events";
import type { Scope } from "@/core/questions/distractors";
import type { CardMode, LevelSource, QuestionContext } from "@/core/questions/question";
import { NOTE_MAX_CHARS, type Tier } from "@/rules";
import type { ConsentRow, DeviceRow, NoteRow, SettingsRow, TableName } from "./schema";

// A record forces every value of the union to be listed, so a new core value cannot be rejected on import.
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

const mode = oneOf<CardMode>({
	code2region: true,
	region2code: true,
	setrecall: true,
	special2holder: true,
	holder2special: true
});
const matchType = oneOf<MatchType>({
	exact: true,
	variant: true,
	typo: true,
	unverified: true,
	none: true
});
const scopeLevel = oneOf<Scope["level"]>({ national: true, group: true, province: true });

const reviewLog = z
	.object({
		...event,
		runId: uuid.nullable(),
		contentId: contentIdSchema,
		mode,
		context: oneOf<QuestionContext>({
			intro: true,
			daily: true,
			drill: true,
			focused: true,
			challenge: true,
			kilat: true,
			placement: true,
			setrecall: true,
			special: true
		}),
		level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		levelSource: oneOf<LevelSource>({ auto: true, manual_up: true, manual_down: true }),
		correct: z.boolean().nullable(),
		timedOut: z.boolean(),
		msToFirstKey: count.nullable(),
		msTotal: count,
		msTyping: count.nullable(),
		keyGapsMs: z.array(count).nullable(),
		deletedChars: count,
		optionChanges: count,
		optionCount: count.nullable(),
		inputMode: oneOf<ReviewLog["inputMode"]>({ keyboard: true, touch: true }),
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
		questionType: oneOf<ReviewLog["questionType"]>({
			intro_read: true,
			choice: true,
			truefalse: true,
			oddoneout: true,
			typed: true,
			setrecall: true
		}),
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
		kind: oneOf<CardEvent["kind"]>({ suspend: true, unsuspend: true }),
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
		algorithm: z.literal("fsrs-6"),
		libraryVersion: z.string().min(1),
		weights: z.array(z.number()),
		status: oneOf<FsrsParams["status"]>({ active: true, rejected: true }),
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
		kind: oneOf<RunKind>({
			daily: true,
			focused: true,
			challenge: true,
			kilat: true,
			placement: true,
			setrecall: true,
			special: true
		}),
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
		placementLevel: oneOf<Tier>({
			pemula: true,
			menengah: true,
			mahir: true,
			ahli: true
		}).nullable()
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
	.object({ policyVersion: z.string().min(1), consentedAt: time, receivedAt: time.nullable() })
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

export function fromWire(table: TableName, row: Record<string, unknown>) {
	const local = Object.fromEntries(
		Object.entries(row).map(([key, value]) => {
			const name = camel(key);
			return [
				name,
				TIME_KEYS.has(name) && typeof value === "string" ? Date.parse(value) : value
			];
		})
	);
	return ROW_SCHEMAS[table].safeParse(local);
}
