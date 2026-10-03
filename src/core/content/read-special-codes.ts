import { z } from "zod";
import { issueMessages } from "./issues";
import { contentSourceSchema, referencePlateSchema, specialSchema } from "./schema";

// Non-strict on purpose: summary, riPairs and other doc-only keys are dropped here.
const specialCodesSchema = z.object({
	sources: z.array(contentSourceSchema),
	specials: z.array(specialSchema),
	referencePlates: z.array(referencePlateSchema)
});

export type SpecialCodes = z.infer<typeof specialCodesSchema>;

export function readSpecialCodes(value: unknown): SpecialCodes {
	const result = specialCodesSchema.safeParse(value);
	if (!result.success)
		throw new Error(
			`special-codes.json: ${issueMessages(value, result.error.issues).join("; ")}`
		);
	return result.data;
}
