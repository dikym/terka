import type { ContentDraft } from "./draft";
import { error, isError, report, type ContentMessage } from "./messages";
import { readCuration } from "./read-curation";
import { readFacts } from "./read-facts";
import { readSpecials } from "./read-specials";
import { factRules } from "./rules/facts";
import { identityRules } from "./rules/identity";
import { placementRules } from "./rules/placement";
import { exclusiveProvinces } from "./rules/provinces";
import { regionRules } from "./rules/regions";
import { revisionRules } from "./rules/revision";
import { specialRules } from "./rules/specials";
import { bundleSchema, type Bundle } from "./schema";

export type BuildOptions = { today: string; release: boolean; previous: unknown };
export type BuildResult = { bundle: Bundle | null; messages: ContentMessage[] };

export function assembleBundle({ curation, specials, facts }: ContentDraft): Bundle {
	const items = new Map(facts.map((item) => [item.number, item]));
	return {
		version: curation.version,
		contentRev: curation.contentRev,
		contentHistory: curation.contentHistory,
		regions: curation.regions.map(({ sources: _sources, issues: _issues, ...region }) => ({
			...region,
			facts: curation.facts
				.filter((entry) => entry.regions.includes(region.id))
				.map((entry) => entry.id)
		})),
		areas: curation.areas,
		facts: curation.facts.flatMap((entry) => {
			const item = items.get(entry.number);
			return item
				? [
						{
							id: entry.id,
							historyLabel: item.historyLabel,
							text: item.text,
							publicationStatus: item.publicationStatus,
							source: entry.source ?? null,
							sourceCheckedAt: entry.sourceCheckedAt ?? null
						}
					]
				: [];
		}),
		specialsVersion: specials.specialsVersion,
		sources: specials.sources,
		specials: specials.specials,
		referencePlates: specials.referencePlates
	};
}

export function buildFromDraft(draft: ContentDraft, options: BuildOptions): BuildResult {
	let messages = [
		...identityRules(draft),
		...regionRules(draft),
		...placementRules(draft),
		...factRules(draft),
		...specialRules(draft, options.today)
	];
	if (options.release)
		messages = messages.map((message) =>
			message.level === "warning"
				? { ...message, level: "error", message: `release: ${message.message}` }
				: message
		);
	if (messages.some(isError)) return { bundle: null, messages };
	const parsed = bundleSchema.safeParse(assembleBundle(draft));
	if (!parsed.success)
		return {
			bundle: null,
			messages: [...messages, error("bundle-schema", parsed.error.message)]
		};
	const bundle = parsed.data;
	messages.push(...revisionRules(bundle, options.previous));
	for (const [regionId, province] of exclusiveProvinces(bundle))
		messages.push(report("exclusive-province", `${regionId} covers ${province} exclusively`));
	return { bundle: messages.some(isError) ? null : bundle, messages };
}

export function buildContent(
	input: { curation: unknown; specialsMarkdown: string; factsMarkdown: string } & BuildOptions
): BuildResult {
	let draft: ContentDraft;
	try {
		draft = {
			curation: readCuration(input.curation),
			specials: readSpecials(input.specialsMarkdown),
			facts: readFacts(input.factsMarkdown)
		};
	} catch (cause) {
		return {
			bundle: null,
			messages: [error("read", cause instanceof Error ? cause.message : String(cause))]
		};
	}
	return buildFromDraft(draft, input);
}
