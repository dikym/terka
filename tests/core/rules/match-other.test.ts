import { describe, expect, test } from "bun:test";
import { matchRegionCode } from "../../../src/core/answers/match-code";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { matchSet, setThreshold } from "../../../src/core/answers/match-set";
import { matchHolder, matchSpecialCode } from "../../../src/core/answers/match-special";
import { ruleBundle } from "./fixtures";

const bundle = ruleBundle();
const dictionary = buildDictionary(bundle);

describe("region code answers (SRD 5.1)", () => {
	test("SR-202: case and spaces are ignored", () => {
		for (const input of ["be", "BE", "B E", " be "])
			expect(matchRegionCode(input, ["be"], bundle).matchType).toBe("exact");
	});
	test("SR-201/SR-203: another code records the pair; an unknown code does not", () => {
		expect(matchRegionCode("BD", ["be"], bundle)).toEqual({
			matchType: "none",
			confusedWith: "bd"
		});
		expect(matchRegionCode("BX", ["be"], bundle)).toEqual({
			matchType: "none",
			confusedWith: null
		});
	});
	test("SR-097: every high code of the shown area is correct", () => {
		expect(matchRegionCode("A", ["a", "b"], bundle).matchType).toBe("exact");
		expect(matchRegionCode("B", ["a", "b"], bundle).matchType).toBe("exact");
	});
});

describe("special plate answers (SRD 5.3)", () => {
	const japan = "cd-49-jepang";
	test("SR-325: aliases, case and a leading embassy word are exact", () => {
		for (const input of ["Japan", "jepang", "Kedubes Jepang"])
			expect(matchHolder(input, japan, bundle).matchType).toBe("exact");
	});
	test("SR-326: another holder is wrong with the pair and no typo tolerance", () => {
		expect(matchHolder("Irak", "cd-45-iran", bundle)).toMatchObject({
			matchType: "none",
			confusedWith: "cd-20-irak"
		});
	});
	test("SR-327: a transposition is a 0.5 typo", () => {
		expect(matchHolder("Jepnag", japan, bundle)).toMatchObject({
			matchType: "typo",
			typoCost: 0.5
		});
	});
	test("SR-328: capital abbreviations get no tolerance", () => {
		expect(matchHolder("UNDF", "cd-58-undp", bundle).matchType).toBe("none");
	});
	test("a medium holder is wrong without a pair", () => {
		expect(matchHolder("Contohland", japan, bundle)).toMatchObject({
			matchType: "none",
			confusedWith: null
		});
	});
	test("SR-329: the CD prefix is optional and leading zeros are dropped", () => {
		for (const input of ["49", "CD 49", "cd49", "049", "C.D-49"])
			expect(matchSpecialCode(input, japan, bundle).matchType).toBe("exact");
	});
	test("SR-330: extra digits and other prefixes are wrong without a pair", () => {
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
	test("SR-331: another entry's number records the pair", () => {
		expect(matchSpecialCode("48", japan, bundle).confusedWith).toBe("cd-48-turki");
	});
});

describe("set answers (SRD 5.2)", () => {
	test("SR-098/SR-100: the threshold is min(5, n − 1)", () => {
		expect(setThreshold(12)).toBe(5);
		expect(setThreshold(3)).toBe(2);
		expect(matchSet([], "dk", dictionary).setThreshold).toBe(2);
		expect(matchSet([], "bk", dictionary).setThreshold).toBe(4);
	});
	test("SR-101/SR-102: duplicates and name-plus-alias count once", () => {
		const result = matchSet(
			["Medan", "Kota Medan", "medan", "Binjai", "Binjay"],
			"bk",
			dictionary
		);
		expect(result.setCorrect).toBe(2);
		expect(result.items).toHaveLength(5);
	});
	test("SR-103: a name of another code records the pair once", () => {
		const result = matchSet(["Sibolga", "Sibolga", "Medan"], "bk", dictionary);
		expect(result.confusions).toEqual(["bb"]);
		expect(result.items[0]).toEqual(["Sibolga", null, "none", 0, "bb"]);
	});
	test("SR-104/SR-105: nothing typed is 0; typos count", () => {
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
	test("an ambiguous bare twin does not count until specified", () => {
		expect(matchSet(["Bima"], "ea", dictionary).setCorrect).toBe(0);
		expect(matchSet(["Kota Bima", "Kabupaten Bima"], "ea", dictionary).setCorrect).toBe(2);
	});
});
