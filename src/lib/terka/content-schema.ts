// The content schema lives in the new core; the old app re-exports it until sub-project 5 removes this folder.
export {
	bundleSchema,
	contentHistorySchema,
	contentIdSchema as contentId,
	contentRevSchema,
	contentSourceSchema,
	factSchema,
	placementTierSchema,
	referencePlateSchema,
	regionAreaSchema,
	areaSchema as bundleAreaSchema,
	regionSchema as bundleRegionSchema,
	specialSchema
} from "@/core/content/schema";
export type {
	Area as BundleArea,
	Bundle,
	ContentSource,
	Fact,
	PlacementTier,
	ReferencePlate,
	Region as BundleRegion,
	RegionArea,
	Special
} from "@/core/content/schema";
