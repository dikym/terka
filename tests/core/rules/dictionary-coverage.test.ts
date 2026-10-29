import { expect, test } from "bun:test";
import {
	areaDisplayName,
	buildDictionary,
	provinceName
} from "../../../src/core/answers/dictionary";
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

test("every alias of a code is accepted for that code", () => {
	const misses: string[] = [];
	for (const region of plates.regions)
		for (const alias of region.aliases) {
			const match = matchName(alias, region.id, dictionary);
			if (match.matchType === "none" || match.matchType === "unverified")
				misses.push(`${region.id}: ${alias} → ${match.matchType}`);
		}
	expect(misses).toEqual([]);
});

test("every code accepts the name of its own province", () => {
	const misses: string[] = [];
	for (const region of plates.regions) {
		const name = provinceName(region.province);
		const match = matchName(name, region.id, dictionary);
		if (match.matchType === "none" || match.matchType === "unverified")
			misses.push(`${region.id}: ${name} → ${match.matchType}`);
	}
	expect(misses).toEqual([]);
});

test("the answers that were refused in practice are accepted", () => {
	for (const [answer, code] of [
		["Banten", "a"],
		["Jogja", "ab"],
		["Yogya", "ab"],
		["DIY", "ab"],
		["Sumatera Utara", "bk"],
		["Sumatera Utara", "bb"],
		["Lombok", "dr"]
	])
		expect([answer, code, matchName(answer, code, dictionary).matchType]).toEqual([
			answer,
			code,
			"exact"
		]);
});

test("a name of one code is not taken for another code of the same region", () => {
	expect(matchName("Lombok", "ea", dictionary)).toMatchObject({
		matchType: "none",
		confusedWith: "dr"
	});
	expect(matchName("Jogja", "ad", dictionary).matchType).toBe("none");
});
