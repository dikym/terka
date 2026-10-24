// Regenerates public/map.svg from geoBoundaries; run by hand, the output is committed.
import { readFile, writeFile } from "node:fs/promises";
import mapshaper from "mapshaper";
import type { Bundle } from "../src/core/content/schema";

const SOURCE =
	"https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbHumanitarian/IDN";
// The source predates the 2022 Papua split, so these two are rebuilt from their kabupaten.
const SPLIT = new Set(["papua", "papua-barat"]);
const RENAMED: Record<string, string> = {
	"dki jakarta": "jakarta",
	"daerah istimewa yogyakarta": "yogyakarta"
};

type Feature = { type: "Feature"; properties: Record<string, string>; geometry: unknown };
type Collection = { type: "FeatureCollection"; features: Feature[] };

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
const areaKey = (name: string) =>
	name
		.toLowerCase()
		.replace(/^kota\s+/, "kota:")
		.trim();

async function download(level: "ADM1" | "ADM2"): Promise<Collection> {
	const response = await fetch(
		`${SOURCE}/${level}/geoBoundaries-IDN-${level}_simplified.geojson`
	);
	if (!response.ok) throw new Error(`${level}: HTTP ${response.status}`);
	return response.json();
}

const bundle: Bundle = JSON.parse(await readFile("src/data/plates.json", "utf8"));
const groupOf = new Map(bundle.regions.map((region) => [region.province, region.group]));
const provinceOfArea = new Map(
	bundle.areas
		.filter((area) => area.province.startsWith("papua"))
		.map((area) => [
			area.type === "kota" ? `kota:${area.name.toLowerCase()}` : area.name.toLowerCase(),
			area.province
		])
);

const [adm1, adm2] = await Promise.all([download("ADM1"), download("ADM2")]);
const problems: string[] = [];
const features: Feature[] = [];
for (const feature of adm1.features) {
	const name = feature.properties.shapeName.toLowerCase();
	const province = RENAMED[name] ?? slug(name);
	if (SPLIT.has(province)) continue;
	if (!groupOf.has(province))
		problems.push(`ADM1 ${feature.properties.shapeName} matches no province`);
	features.push({ ...feature, properties: { province, group: groupOf.get(province) ?? "" } });
}
for (const feature of adm2.features) {
	const province = provinceOfArea.get(areaKey(feature.properties.shapeName));
	if (province)
		features.push({ ...feature, properties: { province, group: groupOf.get(province)! } });
}
const placed = new Set(features.map((feature) => feature.properties.province));
for (const province of groupOf.keys())
	if (!placed.has(province)) problems.push(`province ${province} has no shape`);
if (problems.length > 0) throw new Error(problems.join("\n"));

const output = await mapshaper.applyCommands(
	[
		"-i input.json",
		"-dissolve province copy-fields=group",
		"-simplify 4% keep-shapes",
		"-proj +proj=merc",
		"-split group",
		"-o map.svg format=svg id-field=province width=1000 precision=0.1"
	].join(" "),
	{ "input.json": JSON.stringify({ type: "FeatureCollection", features }) }
);
const svg = String(output["map.svg"])
	.replace(/<\?xml[^>]*>\s*/, "")
	.replace(/<svg /, '<svg id="indonesia" ')
	.replace(/<g id="/g, '<g data-group="')
	.replace(/ (fill|stroke|stroke-width)="[^"]*"/g, "");
await writeFile("public/map.svg", svg);
console.log(`map.svg: ${placed.size} provinces, ${svg.length} bytes`);
