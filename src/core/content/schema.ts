import { z } from "zod";

export const contentIdSchema = z.string().regex(/^[a-z0-9-]{1,32}$/);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const releaseVersionSchema = z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/);
export const contentRevSchema = z.number().int().positive().max(32767);
export const contentHistorySchema = z.array(
	z.object({ contentRev: contentRevSchema, version: releaseVersionSchema })
);
export const sourceDateSchema = z.string().regex(/^\d{4}(-\d{2}-\d{2})?$/);
export const historyLabelSchema = z.enum(["terverifikasi", "diperdebatkan", "mitos"]);
export const placementTierSchema = z.enum(["common", "medium", "rare"]);

export const regionAreaSchema = z.object({ areaId: contentIdSchema, confidence: confidenceSchema });
export const regionSchema = z.object({
	id: contentIdSchema,
	code: z.string().regex(/^[A-Z]{1,2}$/),
	region: z.string().min(1),
	group: contentIdSchema,
	province: contentIdSchema,
	spans: z.array(contentIdSchema),
	placementTier: placementTierSchema,
	confidence: confidenceSchema,
	aliases: z.array(z.string().min(1)),
	areas: z.array(regionAreaSchema).min(1),
	facts: z.array(contentIdSchema)
});
export const areaSchema = z.object({
	id: contentIdSchema,
	type: z.enum(["kota", "kabupaten"]),
	name: z.string().min(1),
	province: contentIdSchema,
	aliases: z.array(z.string().min(1)),
	variants: z.array(z.string().min(1)),
	// 1 = known to almost everyone, 5 = rarely heard outside its province.
	popularity: z.number().int().min(1).max(5)
});
export const factSchema = z.object({
	id: contentIdSchema,
	historyLabel: historyLabelSchema,
	text: z.string().min(1),
	publicationStatus: z.enum(["draft", "ready"]),
	source: z.array(contentIdSchema),
	sourceCheckedAt: isoDateSchema.nullable()
});
export const contentSourceSchema = z.object({
	id: contentIdSchema,
	title: z.string().min(1),
	publisher: z.string().min(1),
	type: z.string().min(1),
	date: sourceDateSchema.nullable(),
	url: z.string().url(),
	locator: z.string().min(1),
	checkedAt: isoDateSchema.nullable(),
	originalUrl: z.string().url().nullable()
});
export const specialSchema = z.object({
	id: contentIdSchema,
	series: z.string(),
	number: z.string(),
	holder: z.string().min(1),
	holderType: z.enum(["country", "organization"]),
	aliases: z.array(z.string().min(1)),
	sourceName: z.string().min(1),
	confidence: confidenceSchema,
	needsReview: z.boolean(),
	sources: z.array(z.string()).min(1),
	validFrom: isoDateSchema,
	reviewBy: isoDateSchema
});
export const referencePlateSchema = z.object({
	id: contentIdSchema,
	series: z.enum(["RI", "CC", "CH"]),
	number: z.string().nullable(),
	label: z.string().min(1),
	example: z.string().min(1),
	confidence: confidenceSchema,
	sources: z.array(z.string()).min(1),
	note: z.string().min(1).nullable(),
	reviewBy: isoDateSchema
});

// Exactly these keys ship to the browser.
export const bundleSchema = z
	.object({
		version: releaseVersionSchema,
		contentRev: contentRevSchema,
		contentHistory: contentHistorySchema.min(1),
		groups: z.array(z.object({ id: contentIdSchema, name: z.string().min(1) })).min(1),
		regions: z.array(regionSchema).min(1),
		areas: z.array(areaSchema).min(1),
		facts: z.array(factSchema),
		sources: z.array(contentSourceSchema),
		specials: z.array(specialSchema),
		referencePlates: z.array(referencePlateSchema)
	})
	.strict();

export type Confidence = z.infer<typeof confidenceSchema>;
export type PlacementTier = z.infer<typeof placementTierSchema>;
export type RegionArea = z.infer<typeof regionAreaSchema>;
export type Region = z.infer<typeof regionSchema>;
export type Area = z.infer<typeof areaSchema>;
export type Fact = z.infer<typeof factSchema>;
export type ContentSource = z.infer<typeof contentSourceSchema>;
export type Special = z.infer<typeof specialSchema>;
export type ReferencePlate = z.infer<typeof referencePlateSchema>;
export type Bundle = z.infer<typeof bundleSchema>;
