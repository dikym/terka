import { draftSources, type ContentDraft } from "./draft";
import { issueMessages } from "./issues";
import { error, isError, report, type ContentMessage } from "./messages";
import { readCuration } from "./read-curation";
import { readFunFacts } from "./read-fun-facts";
import { readSpecialCodes } from "./read-special-codes";
import { coverageRules } from "./rules/coverage";
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

export function assembleBundle(draft: ContentDraft): Bundle {
	const { curation, specials, funFacts } = draft;
	return {
		version: curation.version,
		contentRev: curation.contentRev,
		contentHistory: curation.contentHistory,
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
