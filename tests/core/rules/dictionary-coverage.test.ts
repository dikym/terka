import { expect, test } from "bun:test";
import { areaDisplayName, buildDictionary } from "../../../src/core/answers/dictionary";
import { matchName } from "../../../src/core/answers/match-name";
import type { Bundle } from "../../../src/core/content/schema";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const dictionary = buildDictionary(plates);

test("every area name, alias and variant is accepted for each code that uses the area", () => {
	const misses: string[] = [];
	for (const region of plates.regions)
		for (const membership of region.areas.filter((item) => item.confidence === "high")) {
			const area = plates.areas.find((item) => item.id === membership.areaId)!;
			for (const form of [
				area.name,
				areaDisplayName(area),
				...area.aliases,
				...area.variants
			]) {
				const match = matchName(form, region.id, dictionary);
				const accepted = match.matchType !== "none" && match.matchType !== "unverified";
				if (!accepted || (match.acceptedAreaId !== area.id && !match.ambiguous))
					misses.push(
						`${region.id}: ${form} → ${match.matchType} ${match.acceptedAreaId}`
					);
			}
		}
	expect(misses).toEqual([]);
});
