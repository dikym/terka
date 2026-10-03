import { z } from "zod";
import { issueMessages } from "./issues";
import { contentIdSchema, contentSourceSchema, factSchema, isoDateSchema } from "./schema";

export const funFactSchema = z.object({
	ref: z.number().int().positive(),
	id: contentIdSchema,
	section: z.string().min(1),
	text: z.string().min(1),
	historyLabel: factSchema.shape.historyLabel,
	publicationStatus: factSchema.shape.publicationStatus,
	relatedCodes: z.array(z.string().min(1)),
	source: z.array(contentIdSchema),
	sourceCheckedAt: isoDateSchema.nullable()
});
const funFactsSchema = z.object({
	sources: z.array(contentSourceSchema),
	facts: z.array(funFactSchema)
});

export type FunFact = z.infer<typeof funFactSchema>;
export type FunFacts = z.infer<typeof funFactsSchema>;

export function readFunFacts(value: unknown): FunFacts {
	const result = funFactsSchema.safeParse(value);
	if (!result.success)
		throw new Error(`fun-facts.json: ${issueMessages(value, result.error.issues).join("; ")}`);
	return result.data;
}
