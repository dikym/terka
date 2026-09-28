import { z } from "zod";
import {
	areaSchema,
	contentHistorySchema,
	contentIdSchema,
	contentRevSchema,
	isoDateSchema,
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
		facts: z.array(
			z.object({
				number: z.number().int().positive(),
				id: contentIdSchema,
				regions: z.array(z.string()),
				source: z.string().min(1).optional(),
				sourceCheckedAt: isoDateSchema.optional()
			})
		),
		retiredIds: z.array(z.string())
	})
	.strict();

export type Curation = z.infer<typeof curationSchema>;

// Names the record that failed (e.g. "regions[3] (id bk)") so TR-02 errors point at the entry.
function where(value: unknown, path: (string | number)[]): string {
	const [list, index] = path;
	if (
		typeof index !== "number" ||
		typeof list !== "string" ||
		!value ||
		typeof value !== "object"
	)
		return path.join(".");
	const items = (value as Record<string, unknown>)[list];
	const entry = Array.isArray(items) ? items[index] : undefined;
	const id = entry && typeof entry === "object" && "id" in entry ? String(entry.id) : undefined;
	return `${path.join(".")}${id ? ` (id ${id})` : ""}`;
}

export function readCuration(value: unknown): Curation {
	const result = curationSchema.safeParse(value);
	if (!result.success)
		throw new Error(
			`plate-curation.json: ${result.error.issues
				.map((issue) => `${where(value, issue.path)}: ${issue.message}`)
				.join("; ")}`
		);
	return result.data;
}
