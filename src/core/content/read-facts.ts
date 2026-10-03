import { readSources } from "./markdown";
import type { ContentSource, Fact } from "./schema";

export type FactMarkdown = {
	ref: number;
	line: number;
	historyLabel: Fact["historyLabel"];
	publicationStatus: Fact["publicationStatus"];
	text: string;
	source: string[];
	sourceCheckedAt: string | null;
};
export type FactsMarkdown = { facts: FactMarkdown[]; sources: ContentSource[] };

const FILE = "Terka_Fun_Facts.md";
const SOURCES = "## 11. Daftar Sumber";
const ITEM = /^(\d+)\. \*\*(.+?)\*\* — (.+)$/;
const DRAFT = /^Draf · usulan label: (terverifikasi|diperdebatkan|mitos)$/;
const READY = /^Siap · label: (terverifikasi|diperdebatkan|mitos)$/;
const SOURCE_LINE = /^\s*Sumber: (.+) · diperiksa (\d{4}-\d{2}-\d{2})$/;

export function readFacts(markdown: string): FactsMarkdown {
	const facts: FactMarkdown[] = [];
	markdown.split("\n").forEach((text, index) => {
		const line = index + 1;
		const sourceLine = text.match(SOURCE_LINE);
		if (sourceLine) {
			const fact = facts.at(-1);
			if (!fact) throw new Error(`${FILE} line ${line}: source line before any fact`);
			fact.source = [...sourceLine[1].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
			fact.sourceCheckedAt = sourceLine[2];
			return;
		}
		if (!/^\d+\. \*\*/.test(text)) return;
		const item = text.match(ITEM);
		const heading = item?.[2];
		const ready = heading?.match(READY);
		const label = (heading?.match(DRAFT) ?? ready)?.[1];
		if (!item || !label)
			throw new Error(
				`${FILE} line ${line}: expected "N. **Siap · label: X** — teks" or "N. **Draf · usulan label: X** — teks"`
			);
		facts.push({
			ref: Number(item[1]),
			line,
			historyLabel: label as Fact["historyLabel"],
			publicationStatus: ready ? "ready" : "draft",
			text: item[3].trim(),
			source: [],
			sourceCheckedAt: null
		});
	});
	try {
		return { facts, sources: readSources(markdown, SOURCES) };
	} catch (cause) {
		throw new Error(`${FILE}: ${cause instanceof Error ? cause.message : String(cause)}`);
	}
}
