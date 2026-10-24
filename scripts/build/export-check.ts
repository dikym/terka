import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { releaseVersionSchema } from "../../src/core/content/schema";
import { htmlPathOf, MAIN_ROUTES } from "./routes";

const exists = (path: string) =>
	readFile(path).then(
		() => true,
		() => false
	);

async function sourceFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true });
	return entries
		.filter((entry) => entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name))
		.map((entry) => join(entry.parentPath, entry.name))
		.sort();
}

// Static export has no server at runtime, so anything that needs one must fail the build.
async function serverFeatures(appDir: string): Promise<string[]> {
	const problems: string[] = [];
	for (const file of await sourceFiles(appDir)) {
		const name = relative(appDir, file);
		if (/(^|\/)route\.(ts|js)$/.test(name)) problems.push(`route handler ${name}`);
		else if (/^\s*["']use server["']/m.test(await readFile(file, "utf8")))
			problems.push(`server action ${name}`);
	}
	for (const name of ["middleware", "proxy"])
		for (const ext of ["ts", "js"]) {
			const file = join(dirname(appDir), `${name}.${ext}`);
			if (await exists(file)) problems.push(`${name} ${name}.${ext}`);
		}
	return problems;
}

async function contentProblem(outDir: string): Promise<string | null> {
	let content: { version?: unknown; contentRev?: unknown };
	try {
		content = JSON.parse(await readFile(join(outDir, "plates.json"), "utf8"));
	} catch {
		return "plates.json is missing or unreadable";
	}
	if (!releaseVersionSchema.safeParse(content.version).success)
		return "plates.json has no dated version";
	if (!Number.isInteger(content.contentRev)) return "plates.json has no contentRev";
	return null;
}

export async function checkExport(outDir: string, appDir: string): Promise<string[]> {
	const problems: string[] = [];
	for (const route of MAIN_ROUTES)
		if (!(await exists(join(outDir, htmlPathOf(route)))))
			problems.push(`main route ${route} has no ${htmlPathOf(route)}`);
	problems.push(...(await serverFeatures(appDir)));
	const content = await contentProblem(outDir);
	if (content) problems.push(content);
	return problems;
}
