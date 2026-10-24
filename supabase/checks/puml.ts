export type PumlColumn = { column: string; required: boolean };

const ENTITY = /^entity\s+(?:"([^"]+)"(?:\s+as\s+\w+)?|(\w+))\s*(<<bundle>>)?\s*\{/;
const COLUMN = /^\s*(\*)?\s*([a-z_]+)\s*:/;

// Database entities of the diagram; `<<bundle>>` entities describe plates.json, not tables.
export function pumlEntities(text: string): Map<string, PumlColumn[]> {
	const entities = new Map<string, PumlColumn[]>();
	let current: PumlColumn[] | null = null;
	for (const line of text.split("\n")) {
		const entity = line.match(ENTITY);
		if (entity) {
			current = entity[3] ? null : [];
			if (current) entities.set(entity[1] ?? entity[2], current);
			continue;
		}
		if (line.trim() === "}") current = null;
		const column = current ? line.match(COLUMN) : null;
		if (column) current!.push({ column: column[2], required: column[1] === "*" });
	}
	return entities;
}
