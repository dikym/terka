import { z } from "zod";
import {
	bundleAreaSchema,
	bundleRegionSchema,
	contentId,
	contentSourceSchema,
	referencePlateSchema,
	specialSchema,
	type Bundle,
	type Fact
} from "./content-schema";
import { normalizeName } from "./grading";

const editorialSource = z.object({
	ref: z.string().min(1),
	publisher: z.string().min(1),
	official: z.boolean()
});
const curationSchema = z.object({
	version: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	regions: z.array(
		bundleRegionSchema
			.omit({ facts: true })
			.extend({ sources: z.array(editorialSource), issues: z.array(z.string()) })
	),
	areas: z.array(bundleAreaSchema),
	factLinks: z.array(
		z.object({
			number: z.number().int().positive(),
			id: contentId,
			regions: z.array(z.string())
		})
	),
	retiredIds: z.array(z.string())
});
const specialsFileSchema = z.object({
	specialsVersion: z.string().regex(/^\d{4}\.\d{2}\.\d{2}$/),
	sources: z.array(contentSourceSchema),
	specials: z.array(specialSchema),
	referencePlates: z.array(referencePlateSchema)
});

export type BuildInput = {
	curation: unknown;
	specials: unknown;
	factsMarkdown: string;
	today: string;
	release: boolean;
	revision: string;
};
export type BuildResult = {
	content: Bundle | null;
	errors: string[];
	warnings: string[];
	reports: string[];
};
export type ParsedFact = { number: number; historyLabel: Fact["historyLabel"]; text: string };

const REFERENCE_ONLY = ["RI", "CD", "CC", "CH"];
const TIER_MINIMUM = { common: 8, medium: 10, rare: 10 } as const;
const MAX_MEDIUM_GROUPS = 10;
const factLine = /^(\d+)\. \*\*(.+?)\*\* — (.+)$/;
const draftLabel = /^Draf · usulan label: (terverifikasi|diperdebatkan|legenda)$/;

export function parseFacts(markdown: string): ParsedFact[] {
	return markdown.split("\n").flatMap((line) => {
		const match = line.match(factLine);
		if (!match) return [];
		const label = match[2].match(draftLabel);
		if (!label) throw new Error(`Fact ${match[1]}: unsupported heading "${match[2]}"`);
		return [
			{
				number: Number(match[1]),
				historyLabel: label[1] as Fact["historyLabel"],
				text: match[3].trim()
			}
		];
	});
}

const spaceless = (value: string, stripAdministration = true) =>
	normalizeName(value, stripAdministration).replace(/ /g, "");
// SRD 5.3: holder answers drop a leading "negara"/"kedutaan"/"kedubes"/"republik" and keep no admin stripping.
const holderKey = (value: string) =>
	normalizeName(value, false)
		.replace(/^(?:negara|kedutaan|kedubes|republik) (?=\S)/, "")
		.replace(/ /g, "");
const duplicates = (values: string[]) => [
	...new Set(values.filter((value, index) => values.indexOf(value) !== index))
];

// Region "high" demands an official source, two independent publishers and no open issues (TRD 4.1).
const verifiedRegion = (region: z.infer<typeof curationSchema>["regions"][number]) =>
	region.sources.some((source) => source.official) &&
	new Set(region.sources.map((source) => source.publisher)).size >= 2 &&
	region.issues.length === 0;

export function buildContent(input: BuildInput): BuildResult {
	const errors: string[] = [];
	const warnings: string[] = [];
	const reports: string[] = [];
	const fail = (): BuildResult => ({ content: null, errors, warnings, reports });

	const curationResult = curationSchema.safeParse(input.curation);
	const specialsResult = specialsFileSchema.safeParse(input.specials);
	if (!curationResult.success) errors.push(`curation: ${curationResult.error.message}`);
	if (!specialsResult.success) errors.push(`special plates: ${specialsResult.error.message}`);
	let parsedFacts: ParsedFact[] = [];
	try {
		parsedFacts = parseFacts(input.factsMarkdown);
	} catch (error) {
		errors.push((error as Error).message);
	}
	if (!curationResult.success || !specialsResult.success || errors.length) return fail();
	const curation = curationResult.data;
	const specials = specialsResult.data;

	// Identity rules shared by every kind of content id.
	const regionIds = curation.regions.map((region) => region.id);
	const areaIds = curation.areas.map((area) => area.id);
	const factIds = curation.factLinks.map((link) => link.id);
	const specialIds = specials.specials.map((entry) => entry.id);
	for (const id of duplicates(regionIds)) errors.push(`duplicate region id: ${id}`);
	for (const code of duplicates(curation.regions.map((region) => region.code)))
		errors.push(`duplicate code: ${code}`);
	for (const id of duplicates(areaIds)) errors.push(`duplicate area id: ${id}`);
	for (const id of duplicates(factIds)) errors.push(`duplicate fact id: ${id}`);
	for (const id of duplicates(specialIds)) errors.push(`duplicate special id: ${id}`);
	const retired = new Set(curation.retiredIds);
	for (const id of [...regionIds, ...areaIds, ...factIds, ...specialIds])
		if (retired.has(id)) errors.push(`retired id reused: ${id}`);

	// Regions and memberships.
	const areaById = new Map(curation.areas.map((area) => [area.id, area]));
	const used = new Set<string>();
	const provinceGroup = new Map<string, string>();
	for (const region of curation.regions) {
		if (/^cd-[0-9]/.test(region.id))
			errors.push(`region id looks like a special: ${region.id}`);
		if (specialIds.includes(region.id))
			errors.push(`region id collides with special: ${region.id}`);
		if (REFERENCE_ONLY.includes(region.code))
			errors.push(`${region.code}: reference-only series cannot be a region`);
		const group = provinceGroup.get(region.province);
		if (group && group !== region.group)
			errors.push(`province ${region.province} belongs to two groups`);
		provinceGroup.set(region.province, region.group);
		if (region.confidence === "high" && !verifiedRegion(region))
			errors.push(
				`${region.code}: high confidence requires an official source, two publishers and no open issues`
			);
		if (region.confidence !== "high")
			warnings.push(`${region.code}: confidence ${region.confidence}`);
		for (const membership of region.areas) {
			if (!areaById.has(membership.areaId))
				errors.push(`${region.code}: unknown area ${membership.areaId}`);
			used.add(membership.areaId);
		}
		for (const areaId of duplicates(region.areas.map((membership) => membership.areaId)))
			errors.push(`${region.code}: duplicate membership ${areaId}`);
	}
	for (const area of curation.areas)
		if (!used.has(area.id)) errors.push(`area without a code: ${area.id}`);

	// Area names: aliases/variants must never equal another area's forms; same base names are only reported.
	const names = curation.areas.map((area) => ({ id: area.id, key: spaceless(area.name) }));
	for (const area of curation.areas) {
		for (const form of [...area.aliases, ...area.variants]) {
			const key = spaceless(form);
			const clash = curation.areas.find(
				(other) =>
					other.id !== area.id &&
					[other.name, ...other.aliases, ...other.variants].some(
						(value) => spaceless(value) === key
					)
			);
			if (clash) errors.push(`${area.id}: "${form}" collides with ${clash.id}`);
		}
	}
	for (const [index, first] of names.entries())
		for (const second of names.slice(index + 1))
			if (first.key === second.key)
				reports.push(`same base name: ${first.id} / ${second.id}`);

	// Placement tiers (SRD placement test: stages of 8, 10 and 10).
	for (const [tier, minimum] of Object.entries(TIER_MINIMUM)) {
		const size = curation.regions.filter((region) => region.placementTier === tier).length;
		if (size < minimum)
			errors.push(`placement tier ${tier} has ${size} codes; needs ${minimum}`);
	}
	const mediumGroups = new Set(
		curation.regions
			.filter((region) => region.placementTier === "medium")
			.map((region) => region.group)
	);
	if (mediumGroups.size > MAX_MEDIUM_GROUPS)
		errors.push(
			`placement tier medium spans ${mediumGroups.size} groups; stage 2 fits ${MAX_MEDIUM_GROUPS}`
		);

	// Facts: every numbered doc item has exactly one link and vice versa.
	const numbers = new Set(parsedFacts.map((fact) => fact.number));
	for (const fact of parsedFacts)
		if (!curation.factLinks.some((link) => link.number === fact.number))
			errors.push(`fact ${fact.number} has no factLinks entry`);
	for (const link of curation.factLinks) {
		if (!numbers.has(link.number))
			errors.push(`factLinks ${link.number} (${link.id}) has no fact`);
		for (const regionId of link.regions)
			if (!regionIds.includes(regionId))
				errors.push(`${link.id}: unknown region ${regionId}`);
	}
	const facts: Fact[] = curation.factLinks.flatMap((link) => {
		const parsed = parsedFacts.find((fact) => fact.number === link.number);
		return parsed
			? [
					{
						id: link.id,
						historyLabel: parsed.historyLabel,
						text: parsed.text,
						publicationStatus: "draft" as const,
						source: null,
						sourceCheckedAt: null
					}
				]
			: [];
	});
	for (const fact of facts)
		if (fact.publicationStatus === "ready" && (!fact.source || !fact.sourceCheckedAt))
			errors.push(`${fact.id}: ready fact requires source and sourceCheckedAt`);

	// Specials and reference plates (TRD 4.1).
	const sourceById = new Map(specials.sources.map((source) => [source.id, source]));
	const referenced = new Set<string>();
	const holderForms = specials.specials.map((entry) => ({
		id: entry.id,
		forms: [entry.holder, ...entry.aliases].map(holderKey)
	}));
	for (const entry of specials.specials) {
		if (entry.id.startsWith("ref-")) errors.push(`reference id in specials: ${entry.id}`);
		if (!/^cd-[0-9]{1,3}-[a-z0-9-]+$/.test(entry.id))
			errors.push(`${entry.id}: id must be cd-{number}-{slug}`);
		if (entry.series !== "CD") errors.push(`${entry.id}: series must be CD`);
		if (!/^[1-9][0-9]*$/.test(entry.number))
			errors.push(`${entry.id}: number must be digits without a leading zero`);
		if (!entry.id.startsWith(`cd-${entry.number}-`))
			errors.push(`${entry.id}: id does not match number ${entry.number}`);
		for (const sourceId of entry.sources) {
			referenced.add(sourceId);
			if (!sourceById.has(sourceId)) errors.push(`${entry.id}: unknown source ${sourceId}`);
		}
		if (
			entry.confidence === "high" &&
			!entry.sources.some((id) => sourceById.get(id)?.checkedAt)
		)
			errors.push(`${entry.id}: high entry needs a source with checkedAt`);
		const own = holderForms.find((item) => item.id === entry.id)!.forms;
		const clash = holderForms.find(
			(item) => item.id !== entry.id && item.forms.some((form) => own.includes(form))
		);
		if (clash) errors.push(`${entry.id}: holder or alias collides with ${clash.id}`);
		if (entry.reviewBy < input.today)
			warnings.push(`${entry.id}: reviewBy ${entry.reviewBy} has passed`);
	}
	const high = specials.specials.filter((entry) => entry.confidence === "high");
	for (const number of duplicates(high.map((entry) => entry.number)))
		errors.push(`two high specials share number ${number}`);
	for (const holder of duplicates(high.map((entry) => entry.holder)))
		errors.push(`two high specials share holder ${holder}`);
	for (const plate of specials.referencePlates) {
		if (!plate.id.startsWith("ref-"))
			errors.push(`${plate.id}: reference id must start with ref-`);
		if (plate.series === "RI" && plate.number !== null)
			errors.push(`${plate.id}: RI entry must not carry a number`);
		for (const sourceId of plate.sources) {
			referenced.add(sourceId);
			if (!sourceById.has(sourceId)) errors.push(`${plate.id}: unknown source ${sourceId}`);
		}
		if (plate.reviewBy < input.today)
			warnings.push(`${plate.id}: reviewBy ${plate.reviewBy} has passed`);
	}
	for (const sourceId of referenced) {
		const source = sourceById.get(sourceId);
		if (source?.type === "media-mengutip-instansi" && !source.originalUrl)
			warnings.push(`${sourceId}: media source quoting an agency needs originalUrl`);
	}

	if (input.release) errors.push(...warnings.map((warning) => `release: ${warning}`));
	if (errors.length) return fail();
	const content: Bundle = {
		version: curation.version,
		sourceRevision: input.revision,
		regions: curation.regions.map(({ sources: _sources, issues: _issues, ...region }) => ({
			...region,
			facts: curation.factLinks
				.filter((link) => link.regions.includes(region.id))
				.map((link) => link.id)
		})),
		areas: curation.areas,
		facts,
		specialsVersion: specials.specialsVersion,
		sources: specials.sources,
		specials: specials.specials,
		referencePlates: specials.referencePlates
	};
	return { content, errors, warnings, reports };
}
