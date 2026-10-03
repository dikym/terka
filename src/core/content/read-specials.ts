import { listCell, readSources, readTable, sectionLines } from "./markdown";
import type { Confidence, ContentSource, Special } from "./schema";

export type FormatRow = { series: string; example: string; sources: string[] };
export type SpecialsMarkdown = {
	sources: ContentSource[];
	specials: Special[];
	formats: FormatRow[];
};

const FILE = "Terka_Special_Codes.md";
const FORMATS = "## 2. Format Pelat Khusus";
const CD_LIST = "## 4. Daftar Kode CD";
const SOURCES = "## 8. Daftar Sumber";
const HOLDER_TYPES: Record<string, Special["holderType"]> = {
	negara: "country",
	organisasi: "organization"
};
const CONFIDENCES = ["high", "medium", "low"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function addMonths(isoDate: string, months: number): string {
	const [year, month, day] = isoDate.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
}

export function specialId(number: string, holder: string): string {
	const prefix = `cd-${number}-`;
	const words = holder
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.split(" ");
	let slug = "";
	for (const word of words) {
		const next = slug ? `${slug}-${word}` : word;
		if (prefix.length + next.length > 32) break;
		slug = next;
	}
	// The first word alone can still overflow the budget; hard-cut it so the id
	// stays non-empty after the prefix and never ends on a trailing hyphen.
	if (!slug && words[0]) slug = words[0].slice(0, Math.max(0, 32 - prefix.length));
	return prefix + slug;
}

function fail(line: number, message: string): never {
	throw new Error(`${FILE} line ${line}: ${message}`);
}

export function readSpecials(markdown: string): SpecialsMarkdown {
	try {
		return readSpecialsSource(markdown);
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		throw message.startsWith(FILE) ? cause : new Error(`${FILE}: ${message}`);
	}
}

function readSpecialsSource(markdown: string): SpecialsMarkdown {
	const sources = readSources(markdown, SOURCES);
	const byId = new Map(sources.map((source) => [source.id, source]));
	const dates = (ids: string[], line: number) => {
		const first = byId.get(ids[0]) ?? fail(line, `unknown source ${ids[0] ?? "(none)"}`);
		if (!first.date || !ISO_DATE.test(first.date))
			fail(line, `source ${first.id} needs a full date (YYYY-MM-DD) for validFrom`);
		return { validFrom: first.date, reviewBy: addMonths(first.checkedAt ?? first.date, 6) };
	};

	const listLine = sectionLines(markdown, CD_LIST).find((entry) =>
		entry.text.startsWith("Sumber seluruh baris:")
	);
	// Only the leading backticked ids are sources; later backtick spans are notes.
	const leading =
		listLine?.text.match(/^Sumber seluruh baris:\s*((?:`[^`]+`(?:,\s*)?)+)/)?.[1] ?? "";
	const listSources = [...leading.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
	if (!listLine || !listSources.length)
		throw new Error(`${FILE} ${CD_LIST}: missing "Sumber seluruh baris:" line with source ids`);

	const specials: Special[] = readTable(markdown, CD_LIST, [
		"Kode",
		"Pemegang (nama tampil)",
		"Tipe",
		"Tertulis di lampiran",
		"Alias yang diterima",
		"Label",
		"Tinjau"
	]).map(({ line, cells }) => {
		const number =
			cells.Kode.match(/^CD (\d+)$/)?.[1] ??
			fail(line, `"${cells.Kode}" is not "CD <number>"`);
		const holder = cells["Pemegang (nama tampil)"];
		const holderType = HOLDER_TYPES[cells.Tipe] ?? fail(line, `unknown type "${cells.Tipe}"`);
		const confidence = CONFIDENCES.includes(cells.Label)
			? (cells.Label as Confidence)
			: fail(line, `unknown label "${cells.Label}"`);
		const review = cells.Tinjau;
		if (review !== "ya" && review !== "—")
			fail(line, `Tinjau must be "ya" or "—", found "${review}"`);
		return {
			id: specialId(number, holder),
			series: "CD",
			number,
			holder,
			holderType,
			aliases: listCell(cells["Alias yang diterima"]),
			sourceName: cells["Tertulis di lampiran"],
			confidence,
			sources: listSources,
			...dates(listSources, listLine.line),
			needsReview: review === "ya"
		};
	});

	const formats: FormatRow[] = readTable(markdown, FORMATS, [
		"Kode",
		"Pemakai",
		"Susunan menurut Perpol 7/2021",
		"Contoh di lampiran",
		"Status di Terka",
		"Sumber",
		"Catatan"
	])
		.filter(({ cells }) => cells.Kode !== "CD")
		.map(({ line, cells }) => {
			if (!["RI", "CC", "CH"].includes(cells.Kode))
				fail(line, `unknown format series "${cells.Kode}"`);
			return {
				series: cells.Kode,
				example: cells["Contoh di lampiran"],
				sources: listCell(cells.Sumber)
			};
		});

	return { sources, specials, formats };
}
