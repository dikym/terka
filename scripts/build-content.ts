import { readFile, writeFile } from "node:fs/promises";
import { buildContent } from "../src/core/content/build";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");
const [
	curationText,
	specialCodesText,
	funFactsText,
	specialsMarkdown,
	factsMarkdown,
	previousText
] = await Promise.all([
	read("data/plate-curation.json"),
	read("data/Terka_Special_Codes.json"),
	read("data/Terka_Fun_Facts.json"),
	read("docs/Terka_Special_Codes.md"),
	read("docs/Terka_Fun_Facts.md"),
	read("src/data/plates.json").catch(() => null)
]);
const result = buildContent({
	curation: JSON.parse(curationText),
	specialCodes: JSON.parse(specialCodesText),
	funFacts: JSON.parse(funFactsText),
	specialsMarkdown,
	factsMarkdown,
	today: new Date().toISOString().slice(0, 10),
	release: process.argv.includes("--release"),
	previous: previousText === null ? null : JSON.parse(previousText)
});
for (const message of result.messages) {
	const line = `${message.level}: ${message.message}`;
	if (message.level === "error") console.error(line);
	else if (message.level === "warning") console.warn(line);
	else console.log(line);
}
if (!result.bundle) throw new Error("Content build failed");
await writeFile(
	new URL("src/data/plates.json", root),
	JSON.stringify(result.bundle, null, "\t") + "\n"
);
console.log(
	`${result.bundle.regions.length} codes, ${result.bundle.areas.length} areas, ${result.bundle.specials.length} specials, ${result.bundle.facts.length} facts.`
);
