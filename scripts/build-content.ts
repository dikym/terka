import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { buildContent } from "../src/lib/terka/content-rules";
import { parseContent } from "../src/lib/terka/content";
import { assertLevelThreeCoverage } from "../src/lib/terka/questions";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");
const [curationText, specialsText, factsMarkdown, previousText] = await Promise.all([
	read("data/plate-curation.json"),
	read("data/special-plates.json"),
	read("docs/Terka_Facts.md"),
	read("src/data/plates.json").catch(() => null)
]);
const result = buildContent({
	curation: JSON.parse(curationText),
	specials: JSON.parse(specialsText),
	factsMarkdown,
	today: new Date().toISOString().slice(0, 10),
	release: process.argv.includes("--release"),
	previous: previousText === null ? null : JSON.parse(previousText),
	revision: createHash("sha256")
		.update(curationText + specialsText + factsMarkdown)
		.digest("hex")
});
for (const line of result.reports) console.log(`report: ${line}`);
for (const line of result.warnings) console.warn(`warning: ${line}`);
if (!result.content) throw new Error(`Content build failed:\n${result.errors.join("\n")}`);
assertLevelThreeCoverage(parseContent(result.content));
await writeFile(
	new URL("src/data/plates.json", root),
	JSON.stringify(result.content, null, "\t") + "\n"
);
console.log(
	`${result.content.regions.length} codes, ${result.content.areas.length} areas, ${result.content.specials.length} specials, ${result.content.facts.length} facts.`
);
