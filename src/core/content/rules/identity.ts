import type { ContentDraft } from "../draft";
import { duplicates, error, type ContentMessage } from "../messages";

export function identityRules({ curation, specials }: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	const regionIds = curation.regions.map((region) => region.id);
	const specialIds = specials.specials.map((entry) => entry.id);
	const kinds: [string, string[]][] = [
		["region", regionIds],
		["area", curation.areas.map((area) => area.id)],
		["fact", curation.facts.map((fact) => fact.id)],
		["special", specialIds],
		["reference plate", specials.referencePlates.map((plate) => plate.id)]
	];
	for (const [kind, ids] of kinds)
		for (const id of duplicates(ids))
			out.push(error("duplicate-id", `duplicate ${kind} id ${id}`));
	for (const code of duplicates(curation.regions.map((region) => region.code)))
		out.push(error("duplicate-code", `two regions use code ${code}`));
	const retired = new Set(curation.retiredIds);
	for (const [kind, ids] of kinds)
		for (const id of ids)
			if (retired.has(id))
				out.push(error("retired-id", `${kind} id ${id} was retired and cannot be reused`));
	for (const id of regionIds)
		if (/^cd-[0-9]/.test(id))
			out.push(error("region-special-prefix", `region id ${id} looks like a special id`));
	for (const id of specialIds) {
		if (regionIds.includes(id))
			out.push(
				error("special-region-collision", `${id} is both a region id and a special id`)
			);
		if (id.startsWith("ref-"))
			out.push(error("reference-in-specials", `${id}: reference ids cannot be specials`));
	}
	return out;
}
