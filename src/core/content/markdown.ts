export type SourceLine = { line: number; text: string };
export type TableRow = { line: number; cells: Record<string, string> };

const headingLevel = (text: string) => text.match(/^(#{1,6}) /)?.[1].length ?? 0;
const cellsOf = (text: string) =>
	text
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((cell) => {
			const trimmed = cell.trim();
			return /^`[^`]*`$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
		});

// Lines after `heading` up to the next heading of the same or higher level; line numbers are 1-based.
export function sectionLines(markdown: string, heading: string): SourceLine[] {
	const lines = markdown.split("\n");
	const start = lines.findIndex((text) => text.trim() === heading);
	if (start < 0) throw new Error(`${heading}: section not found`);
	const level = headingLevel(heading);
	const section: SourceLine[] = [];
	for (let index = start + 1; index < lines.length; index++) {
		const own = headingLevel(lines[index]);
		if (own && own <= level) break;
		section.push({ line: index + 1, text: lines[index] });
	}
	return section;
}

// The first table in the section; its header row must equal `headers` exactly.
export function readTable(
	markdown: string,
	heading: string,
	headers: readonly string[]
): TableRow[] {
	const lines = sectionLines(markdown, heading);
	const start = lines.findIndex((entry) => entry.text.trim().startsWith("|"));
	if (start < 0) throw new Error(`${heading}: no table in section`);
	const found = cellsOf(lines[start].text);
	if (found.join(" | ") !== headers.join(" | "))
		throw new Error(
			`${heading}: expected columns ${headers.join(" | ")}, found ${found.join(" | ")}`
		);
	const rows: TableRow[] = [];
	for (const entry of lines.slice(start + 2)) {
		if (!entry.text.trim().startsWith("|")) break;
		const cells = cellsOf(entry.text);
		if (cells.length !== headers.length)
			throw new Error(
				`${heading}: line ${entry.line} has ${cells.length} cells, expected ${headers.length}`
			);
		rows.push({
			line: entry.line,
			cells: Object.fromEntries(headers.map((header, index) => [header, cells[index]]))
		});
	}
	return rows;
}

// A `**Label:** value` line anywhere in the document.
export function readField(markdown: string, label: string): string {
	const prefix = `**${label}:**`;
	const line = markdown.split("\n").find((text) => text.trim().startsWith(prefix));
	if (!line) throw new Error(`${label}: field not found`);
	return line.trim().slice(prefix.length).trim();
}

// A cell listing ids: "`a`, `b`" → ["a", "b"]; "—" → [].
export function listCell(cell: string): string[] {
	if (cell.trim() === "—") return [];
	return cell
		.split(",")
		.map((part) => part.trim().replace(/^`|`$/g, ""))
		.filter(Boolean);
}
