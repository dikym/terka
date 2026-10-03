import type { ContentDraft } from "../draft";
import { error, type ContentMessage } from "../messages";

type Row = Record<string, unknown>;

const pick = (row: Row, fields: readonly string[]): Row =>
	Object.fromEntries(fields.map((field) => [field, row[field]]));

function compare(file: string, kind: string, key: string, markdown: Row[], json: Row[]) {
	const out: ContentMessage[] = [];
	const fail = (message: string) =>
		out.push(error("markdown-json-mismatch", `${file}: ${kind} ${message}`));
	const fromJson = new Map(json.map((row) => [String(row[key]), row]));
	const fromMarkdown = new Map(markdown.map((row) => [String(row[key]), row]));
	for (const [id, row] of fromMarkdown) {
		const twin = fromJson.get(id);
		if (!twin) {
			fail(`${id} is missing from the JSON`);
			continue;
		}
		for (const field of Object.keys(twin))
			if (JSON.stringify(row[field]) !== JSON.stringify(twin[field]))
				fail(`${id} ${field} differs between Markdown and JSON`);
	}
	for (const id of fromJson.keys())
		if (!fromMarkdown.has(id)) fail(`${id} is missing from the Markdown`);
	return out;
}

const PLATE_FIELDS = ["series", "example", "sources"];
const FACT_FIELDS = [
	"ref",
	"historyLabel",
	"publicationStatus",
	"text",
	"source",
	"sourceCheckedAt"
];

export function consistencyRules({ specials, funFacts, markdown }: ContentDraft): ContentMessage[] {
	if (!markdown) return [];
	const codes = "Terka_Special_Codes.md";
	const facts = "Terka_Fun_Facts.md";
	return [
		...compare(codes, "special", "id", markdown.specials.specials, specials.specials),
		...compare(codes, "source", "id", markdown.specials.sources, specials.sources),
		...compare(
			codes,
			"reference plate",
			"series",
			markdown.specials.formats,
			specials.referencePlates.map((plate) => pick(plate, PLATE_FIELDS))
		),
		...compare(
			facts,
			"fact",
			"ref",
			markdown.facts.facts.map((fact) => pick(fact, FACT_FIELDS)),
			funFacts.facts.map((fact) => pick(fact, FACT_FIELDS))
		),
		...compare(facts, "source", "id", markdown.facts.sources, funFacts.sources)
	];
}
