import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import { parseContent, verified } from "../src/lib/terka/content";
import {
	regionSchema,
	PRIORITY_CODES,
	type Area,
	type Content,
	type Region
} from "../src/lib/terka/model";
import { assertLevelThreeCoverage } from "../src/lib/terka/questions";

const root = new URL("../", import.meta.url);
const sourcePath = "docs/Kode_Plat_Nomor_Indonesia.md";
const [source, prd, curationText] = await Promise.all(
	[sourcePath, "docs/Terka_PRD.md", "data/plate-curation.json"].map((path) =>
		readFile(new URL(path, root), "utf8")
	)
);
const curation = z
	.object({
		version: z.string(),
		facts: z
			.record(
				z.object({
					status: z.enum(["terverifikasi", "diperdebatkan", "legenda"]).optional(),
					question: z.string().min(1).optional(),
					answerRegionId: z.string().min(1).optional()
				})
			)
			.default({}),
		regions: z.record(
			regionSchema.pick({
				id: true,
				province: true,
				spans: true,
				aliases: true,
				confidence: true,
				sources: true,
				issues: true,
				suffixes: true
			})
		)
	})
	.parse(JSON.parse(curationText));
const groups: Record<string, string> = {
	SUMATERA: "sumatera",
	JAWA: "jawa",
	"BALI & NUSA TENGGARA": "bali-nusra",
	KALIMANTAN: "kalimantan",
	SULAWESI: "sulawesi",
	MALUKU: "maluku",
	PAPUA: "papua"
};
const slug = (value: string) =>
	value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

function parseAreas(cell: string): Area[] {
	return cell.split(/,\s*/).flatMap((item) => {
		if (item === "Jakarta Pusat/Utara/Barat/Selatan/Timur")
			return ["Pusat", "Utara", "Barat", "Selatan", "Timur"].map((part) => ({
				id: `jakarta-${part.toLowerCase()}`,
				name: `Jakarta ${part}`,
				aliases: []
			}));
		const expansion = item.match(/^(.+?) \(\+ (.+)\)$/);
		if (expansion)
			return [
				expansion[1],
				...expansion[2].split("/").map((part) => `${expansion[1]} ${part}`)
			].map((name) => ({ id: slug(name), name, aliases: [] }));
		const qualifier = item.match(/^(.+?) \((.+)\)$/);
		let name = qualifier?.[1] ?? item;
		const aliases: string[] = [];
		if (qualifier && !/sebagian|termasuk/.test(qualifier[2])) aliases.push(qualifier[2]);
		if (name.includes(" / ")) {
			const parts = name.split(" / ");
			name = parts[0];
			aliases.push(...parts.slice(1));
		}
		if (/[()/+]/.test(name)) throw new Error(`Unmapped area expression: ${item}`);
		return [{ id: slug(name), name, aliases }];
	});
}

const facts: Content["facts"] = [
	...prd.matchAll(/^(\d+)\. \*\*(terverifikasi|diperdebatkan|legenda)\*\* — (.+)$/gm)
].map((match) => ({
	id: `f-${match[1].padStart(3, "0")}`,
	status:
		match[2] === "legenda"
			? "legenda"
			: match[2] === "diperdebatkan"
				? "diperdebatkan"
				: "terverifikasi",
	text: match[3],
	source: `docs/Terka_PRD.md#fact-${match[1]}`,
	...curation.facts[`f-${match[1].padStart(3, "0")}`]
}));
if (Object.keys(curation.facts).some((id) => !facts.some((fact) => fact.id === id)))
	throw new Error("Curation references an unknown fact");
const regions: Region[] = [];
const specialCodes: Content["specialCodes"] = [];
let group = "";
let special = false;
for (const line of source.split("\n")) {
	const heading = line.match(/^## (.+?) — \d+ kode/);
	if (heading) {
		group = groups[heading[1]];
		if (!group) throw new Error(`Unknown group: ${heading[1]}`);
	}
	if (line.startsWith("## KODE KHUSUS")) special = true;
	const cells = line.match(/^\| \*\*([A-Z]{1,2})\*\* \| (.+)$/);
	if (!cells) continue;
	const code = cells[1];
	const columns = cells[2].split("|").map((cell) => cell.trim());
	if (special) {
		specialCodes.push({ code, description: columns[0] });
		continue;
	}
	const metadata = curation.regions[code];
	if (!metadata || !group || !columns[1])
		throw new Error(`Missing curation or malformed row: ${code}`);
	const contextualFacts = facts.filter((fact) => {
		const number = Number(fact.id.slice(2));
		return (
			number <= 9 ||
			number >= 38 ||
			(group === "kalimantan" && number >= 10 && number <= 16) ||
			(group === "papua" && number >= 17 && number <= 20) ||
			(["DD", "DP", "DW"].includes(code) && number >= 21 && number <= 24) ||
			(group === "jawa" && number >= 25 && number <= 28) ||
			(group === "sumatera" && number >= 29 && number <= 32) ||
			(group === "kalimantan" && number === 33) ||
			(["sulawesi", "bali-nusra", "maluku"].includes(group) && [34, 35].includes(number)) ||
			(group === "jawa" && number === 36) ||
			(group === "papua" && number === 37)
		);
	});
	regions.push({
		...metadata,
		code,
		region: columns[0],
		group,
		areas: parseAreas(columns[1]),
		facts: contextualFacts.map((fact) => fact.id),
		sourceText: line,
		sources: metadata.sources.length
			? metadata.sources
			: [{ ref: sourcePath, publisher: "terka-reference", official: false }]
	});
}
if (Object.keys(curation.regions).some((code) => !regions.some((region) => region.code === code)))
	throw new Error("Curation contains a code absent from the source");
const content = parseContent({
	version: curation.version,
	sourceRevision: createHash("sha256")
		.update(source + prd + curationText)
		.digest("hex"),
	regions,
	facts,
	specialCodes
});
assertLevelThreeCoverage(content);

if (process.argv.includes("--release")) {
	const problems = content.regions
		.filter((region) => !verified(region))
		.map(
			(region) =>
				`${region.code}: independent verification incomplete${region.issues.length ? ` (${region.issues.join("; ")})` : ""}`
		);
	for (const code of PRIORITY_CODES) {
		if (!content.regions.find((region) => region.code === code)?.suffixes.some(verified))
			problems.push(`${code}: verified suffix data missing`);
	}
	if (problems.length)
		throw new Error(`Content is not ready for release:\n${problems.join("\n")}`);
}
await writeFile(new URL("src/data/plates.json", root), JSON.stringify(content, null, "\t") + "\n");
console.log(
	`${regions.length} regional codes, ${specialCodes.length} special codes, ${facts.length} facts; ${regions.filter(verified).length} eligible for learning.`
);
