import { z } from "zod";

export const contentId = z.string().regex(/^[a-z0-9-]{1,32}$/);
const confidence = z.enum(["high", "medium", "low"]);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const placementTierSchema = z.enum(["common", "medium", "rare"]);
export const regionAreaSchema = z.object({ areaId: contentId, confidence });
export const bundleRegionSchema = z.object({
	id: contentId,
	code: z.string().regex(/^[A-Z]{1,2}$/),
	region: z.string().min(1),
	group: contentId,
	province: contentId,
	spans: z.array(contentId),
	placementTier: placementTierSchema,
	confidence,
	aliases: z.array(z.string().min(1)),
	areas: z.array(regionAreaSchema).min(1),
	facts: z.array(contentId)
});
export const bundleAreaSchema = z.object({
	id: contentId,
	type: z.enum(["kota", "kabupaten"]),
	name: z.string().min(1),
	province: contentId,
	aliases: z.array(z.string().min(1)),
	variants: z.array(z.string().min(1))
});
export const factSchema = z.object({
	id: contentId,
	historyLabel: z.enum(["terverifikasi", "diperdebatkan", "legenda"]),
	text: z.string().min(1),
	publicationStatus: z.enum(["draft", "ready"]),
	source: z.string().min(1).nullable(),
	sourceCheckedAt: day.nullable()
});
export const contentSourceSchema = z.object({
	id: contentId,
	title: z.string().min(1),
	publisher: z.string().min(1),
	type: z.string().min(1),
	date: day,
	url: z.string().url(),
	locator: z.string().min(1),
	checkedAt: day.nullable(),
	originalUrl: z.string().url().nullable()
});
export const specialSchema = z.object({
	id: contentId,
	series: z.string(),
	number: z.string(),
	holder: z.string().min(1),
	holderType: z.enum(["country", "organization"]),
	aliases: z.array(z.string().min(1)),
	sourceName: z.string().min(1),
	confidence,
	needsReview: z.boolean(),
	sources: z.array(z.string()).min(1),
	validFrom: day,
	reviewBy: day
});
export const referencePlateSchema = z.object({
	id: contentId,
	series: z.enum(["RI", "CC", "CH"]),
	number: z.string().nullable(),
	label: z.string().min(1),
	confidence,
	sources: z.array(z.string()).min(1),
	note: z.string().min(1).nullable(),
	reviewBy: day
});
export const bundleSchema = z.object({
	version: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	sourceRevision: z.string().min(1),
	regions: z.array(bundleRegionSchema).min(1),
	areas: z.array(bundleAreaSchema).min(1),
	facts: z.array(factSchema),
	specialsVersion: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	sources: z.array(contentSourceSchema),
	specials: z.array(specialSchema),
	referencePlates: z.array(referencePlateSchema)
});

export type PlacementTier = z.infer<typeof placementTierSchema>;
export type RegionArea = z.infer<typeof regionAreaSchema>;
export type BundleRegion = z.infer<typeof bundleRegionSchema>;
export type BundleArea = z.infer<typeof bundleAreaSchema>;
export type Fact = z.infer<typeof factSchema>;
export type ContentSource = z.infer<typeof contentSourceSchema>;
export type Special = z.infer<typeof specialSchema>;
export type ReferencePlate = z.infer<typeof referencePlateSchema>;
export type Bundle = z.infer<typeof bundleSchema>;
