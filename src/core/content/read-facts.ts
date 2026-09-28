import type { Fact } from "./schema";

export type FactItem = {
	number: number;
	line: number;
	historyLabel: Fact["historyLabel"];
	publicationStatus: Fact["publicationStatus"];
	text: string;
};

const ITEM = /^(\d+)\. \*\*(.+?)\*\* — (.+)$/;
const DRAFT = /^Draf · usulan label: (terverifikasi|diperdebatkan|legenda)$/;
const READY = /^Siap · label: (terverifikasi|diperdebatkan|legenda)$/;

// Terka_Facts.md §1: every numbered bold line is a fact item and must follow one of two formats.
export function readFacts(markdown: string): FactItem[] {
	return markdown.split("\n").flatMap((text, index) => {
		if (!/^\d+\. \*\*/.test(text)) return [];
		const line = index + 1;
		const item = text.match(ITEM);
		const heading = item?.[2];
		const draft = heading?.match(DRAFT);
		const ready = heading?.match(READY);
		const label = (draft ?? ready)?.[1];
		if (!item || !label)
			throw new Error(
				`Terka_Facts.md line ${line}: expected "N. **Draf · usulan label: X** — teks" or "N. **Siap · label: X** — teks"`
			);
		return [
			{
				number: Number(item[1]),
				line,
				historyLabel: label as Fact["historyLabel"],
				publicationStatus: ready ? "ready" : "draft",
				text: item[3].trim()
			}
		];
	});
}
