// CLAUDE.md: test names and comments carry no catalogue ids and no document references.
import { Glob } from "bun";

const ID = /\b(?:SR|TR|E2E|AC)-\d+/;
const DOC = /\b(?:SRD|TRD|PRD|ERD)\b|\bMicrocopy\b|\bTests §/;
const TITLE = /\b(?:test|describe|it)(?:\.\w+)?\(\s*(["'`])((?:(?!\1).)*)\1/g;
const BLOCK = /\/\*[\s\S]*?\*\//g;
// "//" after a colon is a URL, not a comment.
const LINE = /(?:^|[^:])\/\/(.*)$/;
const HASH = /(?:^|\s)#(.*)$/;

const flagged = (text: string) => ID.test(text) || DOC.test(text);

export function findViolations(files: { path: string; text: string }[]): string[] {
	const problems: string[] = [];
	for (const { path, text } of files) {
		const script = /\.(sh|ya?ml)$/.test(path);
		for (const [, , title] of text.matchAll(TITLE))
			if (flagged(title)) problems.push(`${path}: test name "${title}"`);
		const comments = script
			? text.split("\n").flatMap((line) => line.match(HASH)?.[1] ?? [])
			: [
					...[...text.matchAll(BLOCK)].map(([comment]) => comment),
					...text.split("\n").flatMap((line) => line.match(LINE)?.[1] ?? [])
				];
		for (const comment of comments)
			if (flagged(comment)) problems.push(`${path}: comment "${comment.trim()}"`);
	}
	return problems;
}

const ROOTS = ["src", "tests", "scripts", "supabase/checks", ".github/workflows"];
// The checker's own test holds violating samples on purpose.
const SKIP = new Set(["tests/scripts/test-names.test.ts"]);

export async function repoFiles(): Promise<{ path: string; text: string }[]> {
	const files: { path: string; text: string }[] = [];
	for (const root of ROOTS)
		for await (const path of new Glob(`${root}/**/*.{ts,tsx,mjs,sh,yml}`).scan({ dot: true }))
			if (!SKIP.has(path)) files.push({ path, text: await Bun.file(path).text() });
	return files;
}

if (import.meta.main) {
	const problems = findViolations(await repoFiles());
	for (const problem of problems) console.error(problem);
	process.exit(problems.length > 0 ? 1 : 0);
}
