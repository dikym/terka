import { listCell, readField, readTable, sectionLines } from "./markdown";
import type { Confidence, ContentSource, ReferencePlate, Special } from "./schema";

export type SpecialsSource = {
	specialsVersion: string;
	sources: ContentSource[];
	specials: Special[];
	referencePlates: ReferencePlate[];
};

const FILE = "Terka_Kode_Khusus.md";
const FORMATS = "## 2. Format Pelat Khusus";
const CD_LIST = "## 4. Daftar Kode CD";
const SOURCES = "## 8. Daftar Sumber";
const HOLDER_TYPES: Record<string, Special["holderType"]> = {
	negara: "country",
	organisasi: "organization"
};
const CONFIDENCES = ["high", "medium", "low"];
const nullable = (cell: string) => (cell === "—" ? null : cell);

export function addMonths(isoDate: string, months: number): string {
	const [year, month, day] = isoDate.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1 + months, day)).toISOString().slice(0, 10);
}

// TRD 4.1: `cd-{number}-{slug}`, at most 32 characters, cut at a word boundary.
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
	return prefix + slug;
}

function fail(line: number, message: string): never {
	throw new Error(`${FILE} line ${line}: ${message}`);
}

export function readSpecials(markdown: string): SpecialsSource {
	const specialsVersion = readField(markdown, "Versi data kode khusus");
	const sources: ContentSource[] = readTable(markdown, SOURCES, [
		"ID",
		"Judul",
		"Penerbit",
		"Jenis",
		"Tanggal",
		"Diperiksa",
		"URL",
		"URL asli",
		"Lokasi"
	]).map(({ cells }) => ({
		id: cells.ID,
		title: cells.Judul,
		publisher: cells.Penerbit,
		type: cells.Jenis,
		date: cells.Tanggal,
		checkedAt: nullable(cells.Diperiksa),
		url: cells.URL,
		originalUrl: nullable(cells["URL asli"]),
		locator: cells.Lokasi
	}));
	const byId = new Map(sources.map((source) => [source.id, source]));
	// Kode Khusus §7: entries are re-checked every six months from the source's check date.
	const dates = (ids: string[], line: number) => {
		const first = byId.get(ids[0]) ?? fail(line, `unknown source ${ids[0] ?? "(none)"}`);
		return { validFrom: first.date, reviewBy: addMonths(first.checkedAt ?? first.date, 6) };
	};

	const listLine = sectionLines(markdown, CD_LIST).find((entry) =>
		entry.text.startsWith("Sumber seluruh baris:")
	);
	// Only the run of backticked ids right after the prefix; stop at the first non-id token
	// so later, unrelated backtick spans in the same paragraph (e.g. `country`/`organization`
	// in the Tipe-column note) aren't picked up as sources.
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

	const referencePlates: ReferencePlate[] = readTable(markdown, FORMATS, [
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
			const series = cells.Kode;
			if (series !== "RI" && series !== "CC" && series !== "CH")
				fail(line, `unknown format series "${series}"`);
			const ids = listCell(cells.Sumber);
			return {
				id: `ref-${series.toLowerCase()}-format`,
				series,
				number: null,
				label: `${cells.Pemakai}; format ${cells["Susunan menurut Perpol 7/2021"]}`,
				confidence: "high" as const,
				sources: ids,
				note: nullable(cells.Catatan),
				reviewBy: dates(ids, line).reviewBy
			};
		});

	return { specialsVersion, sources, specials, referencePlates };
}
