import { z } from "zod";
import { issueMessages } from "./issues";
import {
	areaSchema,
	contentHistorySchema,
	contentIdSchema,
	contentRevSchema,
	regionSchema,
	releaseVersionSchema
} from "./schema";

export const curationSchema = z
	.object({
		version: releaseVersionSchema,
		contentRev: contentRevSchema,
		contentHistory: contentHistorySchema.min(1),
		groups: z.array(z.object({ id: contentIdSchema, name: z.string().min(1) })).min(1),
		regions: z.array(
			regionSchema.omit({ facts: true }).extend({
				sources: z.array(
					z.object({
						ref: z.string().min(1),
						publisher: z.string().min(1),
						official: z.boolean()
					})
				),
				issues: z.array(z.string())
			})
		),
		areas: z.array(areaSchema),
		retiredIds: z.array(z.string())
	})
	.strict();

export type Curation = z.infer<typeof curationSchema>;

export function readCuration(value: unknown): Curation {
	const result = curationSchema.safeParse(value);
	if (!result.success)
		throw new Error(
			`plate-curation.json: ${issueMessages(value, result.error.issues).join("; ")}`
		);
	return result.data;
}
