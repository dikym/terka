import { draftSources, type ContentDraft } from "@/core/content/draft";
import { issueMessages } from "@/core/content/issues";
import { error, isError, report, type ContentMessage } from "@/core/content/messages";
import { readCuration } from "@/core/content/read-curation";
import { readFunFacts } from "@/core/content/read-fun-facts";
import { readSpecialCodes } from "@/core/content/read-special-codes";
import { coverageRules } from "@/core/content/rules/coverage";
import { factRules } from "@/core/content/rules/facts";
import { identityRules } from "@/core/content/rules/identity";
import { mapRules } from "@/core/content/rules/map";
import { placementRules } from "@/core/content/rules/placement";
import { exclusiveProvinces } from "@/core/content/rules/provinces";
import { regionRules } from "@/core/content/rules/regions";
import { revisionRules } from "@/core/content/rules/revision";
import { specialRules } from "@/core/content/rules/specials";
import { bundleSchema, type Bundle } from "@/core/content/schema";

export type BuildOptions = {
	today: string;
	release: boolean;
	previous: unknown;
	mapIds?: readonly string[];
};
export type BuildResult = { bundle: Bundle | null; messages: ContentMessage[] };

export function assembleBundle(draft: ContentDraft): Bundle {
	const { curation, specials, funFacts } = draft;
	return {
		version: curation.version,
		contentRev: curation.contentRev,
		contentHistory: curation.contentHistory,
		groups: curation.groups,
		regions: curation.regions.map(({ sources: _sources, issues: _issues, ...region }) => ({
			...region,
			facts: funFacts.facts
				.filter((fact) => fact.relatedCodes.includes(region.code))
				.map((fact) => fact.id)
		})),
		areas: curation.areas,
		facts: funFacts.facts.map((fact) => ({
			id: fact.id,
			historyLabel: fact.historyLabel,
			text: fact.text,
			publicationStatus: fact.publicationStatus,
			source: fact.source,
			sourceCheckedAt: fact.sourceCheckedAt
		})),
		sources: draftSources(draft),
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
	const assembled = assembleBundle(draft);
	const parsed = bundleSchema.safeParse(assembled);
	if (!parsed.success)
		return {
			bundle: null,
			messages: [
				...messages,
				error("bundle-schema", issueMessages(assembled, parsed.error.issues).join("; "))
			]
		};
	const bundle = parsed.data;
	messages.push(...revisionRules(bundle, options.previous, draft.curation.retiredIds));
	messages.push(...coverageRules(bundle));
	if (options.mapIds) messages.push(...mapRules(bundle, options.mapIds));
	for (const [regionId, province] of exclusiveProvinces(bundle))
		messages.push(report("exclusive-province", `${regionId} covers ${province} exclusively`));
	return { bundle: messages.some(isError) ? null : bundle, messages };
}

export function buildContent(
	input: { curation: unknown; specialCodes: unknown; funFacts: unknown } & BuildOptions
): BuildResult {
	let draft: ContentDraft;
	try {
		draft = {
			curation: readCuration(input.curation),
			specials: readSpecialCodes(input.specialCodes),
			funFacts: readFunFacts(input.funFacts)
		};
	} catch (cause) {
		return {
			bundle: null,
			messages: [error("read", cause instanceof Error ? cause.message : String(cause))]
		};
	}
	return buildFromDraft(draft, input);
}
