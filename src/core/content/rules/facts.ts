import { draftSources, type ContentDraft } from "../draft";
import { duplicates, error, type ContentMessage } from "../messages";

export function factRules(draft: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	const known = new Set(draftSources(draft).map((source) => source.id));
	const facts = draft.funFacts.facts;
	for (const ref of duplicates(facts.map((fact) => String(fact.ref))))
		out.push(error("duplicate-fact-ref", `fun-facts.json lists ref ${ref} twice`));
	for (const fact of facts) {
		for (const id of fact.source)
			if (!known.has(id))
				out.push(error("fact-unknown-source", `${fact.id}: unknown source ${id}`));
		if (fact.publicationStatus === "ready" && (!fact.source.length || !fact.sourceCheckedAt))
			out.push(
				error(
					"ready-fact-source",
					`${fact.id}: a ready fact needs source and sourceCheckedAt`
				)
			);
	}
	return out;
}
