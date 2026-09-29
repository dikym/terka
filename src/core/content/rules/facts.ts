import type { ContentDraft } from "../draft";
import { duplicates, error, type ContentMessage } from "../messages";

// TRD 4.1 "Publikasi fakta" and Facts §1: document items and curation entries pair up one to one.
export function factRules({ curation, facts }: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	const regionIds = new Set(curation.regions.map((region) => region.id));
	const entries = new Map(curation.facts.map((entry) => [entry.number, entry]));
	for (const number of duplicates(facts.map((item) => String(item.number))))
		out.push(error("duplicate-fact-number", `Terka_Facts.md lists fact ${number} twice`));
	for (const number of duplicates(curation.facts.map((entry) => String(entry.number))))
		out.push(
			error(
				"duplicate-fact-entry",
				`plate-curation.json lists curation.facts ${number} twice`
			)
		);
	for (const item of facts) {
		const entry = entries.get(item.number);
		if (!entry) {
			out.push(
				error(
					"fact-without-entry",
					`fact ${item.number} (line ${item.line}) has no facts entry in plate-curation.json`
				)
			);
			continue;
		}
		if (item.publicationStatus === "ready" && (!entry.source || !entry.sourceCheckedAt))
			out.push(
				error(
					"ready-fact-source",
					`${entry.id}: a ready fact needs source and sourceCheckedAt`
				)
			);
	}
	for (const entry of curation.facts) {
		if (!facts.some((item) => item.number === entry.number))
			out.push(
				error(
					"entry-without-fact",
					`${entry.id}: fact ${entry.number} is not in Terka_Facts.md`
				)
			);
		for (const regionId of entry.regions)
			if (!regionIds.has(regionId))
				out.push(error("fact-unknown-region", `${entry.id}: unknown region ${regionId}`));
	}
	return out;
}
