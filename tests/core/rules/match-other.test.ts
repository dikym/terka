import { describe, expect, test } from "bun:test";
import { matchRegionCode } from "../../../src/core/answers/match-code";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { matchSet, setThreshold } from "../../../src/core/answers/match-set";
import { matchHolder, matchSpecialCode } from "../../../src/core/answers/match-special";
import { ruleBundle } from "./fixtures";

const bundle = ruleBundle();
const dictionary = buildDictionary(bundle);

describe("region code answers", () => {
	test("case and spaces are ignored", () => {
		for (const input of ["be", "BE", "B E", " be "])
			expect(matchRegionCode(input, ["be"], bundle).matchType).toBe("exact");
	});
	test("another code records the pair; an unknown code does not", () => {
		expect(matchRegionCode("BD", ["be"], bundle)).toEqual({
			matchType: "none",
			confusedWith: "bd"
		});
		expect(matchRegionCode("BX", ["be"], bundle)).toEqual({
			matchType: "none",
			confusedWith: null
		});
	});
	test("every high code of the shown area is correct", () => {
		expect(matchRegionCode("A", ["a", "b"], bundle).matchType).toBe("exact");
		expect(matchRegionCode("B", ["a", "b"], bundle).matchType).toBe("exact");
	});
});

describe("special plate answers", () => {
	const japan = "cd-49-jepang";
	test("aliases, case and a leading embassy word are exact", () => {
		for (const input of ["Japan", "jepang", "Kedubes Jepang"])
			expect(matchHolder(input, japan, bundle).matchType).toBe("exact");
	});
	test("another holder is wrong with the pair and no typo tolerance", () => {
		expect(matchHolder("Irak", "cd-45-iran", bundle)).toMatchObject({
			matchType: "none",
			confusedWith: "cd-20-irak"
		});
	});
	test("a transposition is a 0.5 typo", () => {
		expect(matchHolder("Jepnag", japan, bundle)).toMatchObject({
			matchType: "typo",
			typoCost: 0.5
		});
	});
	test("capital abbreviations get no tolerance", () => {
		expect(matchHolder("UNDF", "cd-58-undp", bundle).matchType).toBe("none");
	});
	test("a medium holder is wrong without a pair", () => {
		expect(matchHolder("Contohland", japan, bundle)).toMatchObject({
			matchType: "none",
			confusedWith: null
		});
	});
	test("the CD prefix is optional and leading zeros are dropped", () => {
		for (const input of ["49", "CD 49", "cd49", "049", "C.D-49"])
			expect(matchSpecialCode(input, japan, bundle).matchType).toBe("exact");
	});
	test("extra digits and other prefixes are wrong without a pair", () => {
		expect(matchSpecialCode("CD 49 07", japan, bundle)).toEqual({
			matchType: "none",
			confusedWith: null,
			extraDigits: true
		});
		expect(matchSpecialCode("CC 49", japan, bundle)).toEqual({
			matchType: "none",
			confusedWith: null,
			extraDigits: false
		});
	});
	test("another entry's number records the pair", () => {
		expect(matchSpecialCode("48", japan, bundle).confusedWith).toBe("cd-48-turki");
	});
});

describe("set answers", () => {
	test("the threshold is min(5, n − 1)", () => {
		expect(setThreshold(12)).toBe(5);
		expect(setThreshold(3)).toBe(2);
		expect(matchSet([], "dk", dictionary).setThreshold).toBe(2);
		expect(matchSet([], "bk", dictionary).setThreshold).toBe(4);
	});
	test("duplicates and name-plus-alias count once", () => {
		const result = matchSet(
			["Medan", "Kota Medan", "medan", "Binjai", "Binjay"],
			"bk",
			dictionary
		);
		expect(result.setCorrect).toBe(2);
		expect(result.items).toHaveLength(5);
	});
	test("a name of another code records the pair once", () => {
		const result = matchSet(["Sibolga", "Sibolga", "Medan"], "bk", dictionary);
		expect(result.confusions).toEqual(["bb"]);
		expect(result.items[0]).toEqual(["Sibolga", null, "none", 0, "bb"]);
	});
	test("nothing typed is 0; typos count", () => {
		expect(matchSet([], "bk", dictionary)).toMatchObject({ setCorrect: 0, correct: false });
		const typed = matchSet(
			["Mdean", "Binjai", "Deli Serdang", "Tebing Tinggi"],
			"bk",
			dictionary
		);
		expect(typed).toMatchObject({ setCorrect: 4, correct: true });
		expect(typed.items[0]).toEqual(["Mdean", "kota-medan", "typo", 0.5, null]);
	});
	test("medium members and province names never count", () => {
		expect(matchSet(["Langkat", "Sumatera Utara"], "bk", dictionary).setCorrect).toBe(0);
		expect(matchSet(["Bali"], "dk", dictionary).setCorrect).toBe(0);
	});
	test("a bare twin counts once as the first twin; the other twin needs its prefix", () => {
		const bare = matchSet(["Bima"], "ea", dictionary);
		expect(bare.setCorrect).toBe(1);
		expect(bare.items[0]).toEqual(["Bima", "kota-bima", "exact", 0, null]);
		expect(matchSet(["Bima", "Kabupaten Bima"], "ea", dictionary).setCorrect).toBe(2);
		expect(matchSet(["Bima", "Bima"], "ea", dictionary).setCorrect).toBe(1);
		expect(matchSet(["Kota Bima", "Kabupaten Bima"], "ea", dictionary).setCorrect).toBe(2);
	});
});
