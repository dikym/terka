// Copies the popularity tiers from docs/City_Popularity_Ranking.md into data/plate-curation.json.
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const curationUrl = new URL("data/plate-curation.json", root);
const doc = await readFile(new URL("docs/City_Popularity_Ranking.md", root), "utf8");
const curation = JSON.parse(await readFile(curationUrl, "utf8"));

// The ranking spells this city the official way; the curation keeps the older spelling.
const OVERRIDES: Record<string, string> = { padangsidimpuan: "kota-padang-sidempuan" };

type Area = { id: string; type: string; name: string; aliases: string[]; variants: string[] };
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "");
const areas: Area[] = curation.areas;
const tiers = new Map<string, number>();
let tier = 0;
for (const line of doc.split("\n")) {
	const heading = line.match(/^## Tier (\d)/);
	if (heading) {
		tier = Number(heading[1]);
		continue;
	}
	const row = line.match(/^\| \d+ \| (Kota|Kab\.) ([^|]+?) \|/);
	if (!row) continue;
	const type = row[1] === "Kota" ? "kota" : "kabupaten";
	const name = normalize(row[2]);
	const matches = OVERRIDES[name]
		? areas.filter((area) => area.id === OVERRIDES[name])
		: areas.filter(
				(area) =>
					area.type === type &&
					[area.name, ...area.aliases, ...area.variants].some(
						(form) => normalize(form) === name
					)
			);
	if (matches.length !== 1) throw new Error(`${row[1]} ${row[2]}: ${matches.length} matches`);
	if (tiers.has(matches[0].id)) throw new Error(`${matches[0].id} is ranked twice`);
	tiers.set(matches[0].id, tier);
}
const missing = areas.filter((area) => !tiers.has(area.id)).map((area) => area.id);
if (missing.length) throw new Error(`no tier for ${missing.join(", ")}`);

curation.areas = areas.map((area) => ({ ...area, popularity: tiers.get(area.id) }));
await writeFile(curationUrl, JSON.stringify(curation, null, "\t") + "\n");
console.log(`${tiers.size} areas ranked.`);
