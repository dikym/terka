import type { z } from "zod";

// Names the record that failed (e.g. "regions[3] (id bk)") so errors point at the entry;
// a top-level issue (empty path) names the whole document instead of an empty string.
export function where(value: unknown, path: (string | number)[]): string {
	if (path.length === 0) return "(root)";
	const [list, index] = path;
	if (
		typeof index !== "number" ||
		typeof list !== "string" ||
		!value ||
		typeof value !== "object"
	)
		return path.join(".");
	const items = (value as Record<string, unknown>)[list];
	const entry = Array.isArray(items) ? items[index] : undefined;
	const id = entry && typeof entry === "object" && "id" in entry ? String(entry.id) : undefined;
	return `${path.join(".")}${id ? ` (id ${id})` : ""}`;
}

export function issueMessages(value: unknown, issues: z.ZodIssue[]): string[] {
	return issues.map((issue) => `${where(value, issue.path)}: ${issue.message}`);
}
