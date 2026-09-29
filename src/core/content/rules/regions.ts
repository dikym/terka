import { compactName } from "../../text";
import type { ContentDraft } from "../draft";
import { duplicates, error, report, warning, type ContentMessage } from "../messages";

const REFERENCE_SERIES = ["RI", "CD", "CC", "CH"];

export function regionRules({ curation }: ContentDraft): ContentMessage[] {
	const out: ContentMessage[] = [];
	const groups = new Set(curation.groups.map((group) => group.id));
	const areaIds = new Set(curation.areas.map((area) => area.id));
	const used = new Set<string>();
	const provinceGroup = new Map<string, string>();
	for (const region of curation.regions) {
		if (!groups.has(region.group))
			out.push(error("unknown-group", `${region.id}: unknown group ${region.group}`));
		if (REFERENCE_SERIES.includes(region.code))
			out.push(
				error("reference-series", `${region.id}: ${region.code} is a reference-only series`)
			);
		const group = provinceGroup.get(region.province);
		if (group && group !== region.group)
			out.push(
				error("province-groups", `${region.province} is in ${group} and ${region.group}`)
			);
		provinceGroup.set(region.province, region.group);
		const verified =
			region.sources.some((source) => source.official) &&
			new Set(region.sources.map((source) => source.publisher)).size >= 2 &&
			region.issues.length === 0;
		if (region.confidence === "high" && !verified)
			out.push(
				error(
					"region-evidence",
					`${region.id}: high confidence needs an official source, two publishers and no open issues`
				)
			);
		if (region.confidence !== "high")
			out.push(warning("region-confidence", `${region.id}: confidence ${region.confidence}`));
		for (const membership of region.areas) {
			used.add(membership.areaId);
			if (!areaIds.has(membership.areaId))
				out.push(error("unknown-area", `${region.id}: unknown area ${membership.areaId}`));
		}
		for (const areaId of duplicates(region.areas.map((membership) => membership.areaId)))
			out.push(error("duplicate-membership", `${region.id}: ${areaId} is listed twice`));
	}
	for (const area of curation.areas)
		if (!used.has(area.id))
			out.push(error("orphan-area", `${area.id}: no code uses this area`));

	// An alias or variant equal to another area's form would accept a wrong answer as correct.
	const forms = curation.areas.map((area) => ({
		id: area.id,
		keys: [area.name, ...area.aliases, ...area.variants].map(compactName)
	}));
	for (const area of curation.areas)
		for (const form of [...area.aliases, ...area.variants]) {
			const key = compactName(form);
			const clash = forms.find((other) => other.id !== area.id && other.keys.includes(key));
			if (clash)
				out.push(
					error("area-form-collision", `${area.id} "${form}" collides with ${clash.id}`)
				);
		}
	const names = curation.areas.map((area) => ({ id: area.id, key: compactName(area.name) }));
	for (const [index, first] of names.entries())
		for (const second of names.slice(index + 1))
			if (first.key === second.key)
				out.push(report("same-name", `same base name: ${first.id} / ${second.id}`));
	return out;
}
