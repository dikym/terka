import type { Curation } from "./read-curation";
import type { FunFacts } from "./read-fun-facts";
import type { SpecialCodes } from "./read-special-codes";
import type { ContentSource } from "./schema";

export type ContentDraft = {
	curation: Curation;
	specials: SpecialCodes;
	funFacts: FunFacts;
};

export function draftSources({ specials, funFacts }: ContentDraft): ContentSource[] {
	const byId = new Map<string, ContentSource>();
	for (const source of [...specials.sources, ...funFacts.sources])
		if (!byId.has(source.id)) byId.set(source.id, source);
	return [...byId.values()];
}
