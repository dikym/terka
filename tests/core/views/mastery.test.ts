import { describe, expect, test } from "bun:test";
import { NATIONAL } from "../../../src/core/questions/distractors";
import {
	levelIndicator,
	masteryMap,
	scopeMastery,
	specialMastery
} from "../../../src/core/views/mastery";
import { fresh, reviewCard, ruleBundle, seedCard } from "../replay/fixtures";

const bundle = ruleBundle();
const BALI = { level: "province", id: "bali" } as const;
const SUMATERA = { level: "group", id: "sumatera" } as const;
const mature = reviewCard({ state: "mature", intervalDays: 40, passedLevel3: true });
const flag = { occurrences: [], flagged: true, cleared: false, drillStreak: 0, drillDay: null };

function masteredBali() {
	const state = fresh();
	for (const mode of ["code2region", "region2code", "setrecall"])
		seedCard(state, `dk::${mode}`, mature);
	return state;
}

describe("mastery per scope", () => {
	test("percent is mature over counted cards", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", mature);
		seedCard(state, "dk::region2code", reviewCard());
		seedCard(state, "dk::setrecall", mature);
		expect(scopeMastery(state, bundle, BALI)).toEqual({
			counted: 3,
			mature: 2,
			percent: 67,
			mastered: false
		});
	});
	test("all mature with no active pair is mastered", () => {
		expect(scopeMastery(masteredBali(), bundle, BALI)).toMatchObject({
			percent: 100,
			mastered: true
		});
	});
	test("an active pair inside or across the scope blocks mastery, in either direction", () => {
		const inside = masteredBali();
		inside.pairs.set("bk>dk", flag);
		expect(scopeMastery(inside, bundle, BALI).mastered).toBe(false);
		const reverse = masteredBali();
		reverse.pairs.set("dk>bk", flag);
		expect(scopeMastery(reverse, bundle, BALI).mastered).toBe(false);
	});
	test("locked cards and cards suspended by the data are left out", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", mature);
		expect(scopeMastery(state, bundle, BALI)).toMatchObject({
			counted: 1,
			percent: 100,
			mastered: true
		});
		state.content.set("dk", "confidence");
		expect(scopeMastery(state, bundle, BALI)).toEqual({
			counted: 0,
			mature: 0,
			percent: null,
			mastered: false
		});
	});
	test("a province whose codes are all medium has no percent and cannot be mastered", () => {
		const medium = ruleBundle();
		medium.regions.find((region) => region.id === "db")!.confidence = "medium";
		expect(
			scopeMastery(fresh(medium), medium, { level: "province", id: "sulawesi-utara" })
		).toEqual({
			counted: 0,
			mature: 0,
			percent: null,
			mastered: false
		});
	});
	test("new cards count as not yet mastered", () => {
		expect(scopeMastery(fresh(), bundle, SUMATERA)).toMatchObject({
			counted: 7,
			mature: 0,
			percent: 0
		});
	});
});

describe("map, special codes and level indicator", () => {
	test("the map has every group and province of the data", () => {
		const map = masteryMap(fresh(), bundle);
		expect([...map.groups.keys()].sort()).toEqual([
			"bali-nusa-tenggara",
			"jawa",
			"sulawesi",
			"sumatera"
		]);
		expect(map.provinces.get("bali")).toMatchObject({ counted: 1 });
	});
	test("special codes are measured apart and never change region mastery", () => {
		const state = fresh();
		for (const cardId of state.cards.keys())
			if (cardId.startsWith("cd-")) seedCard(state, cardId, mature);
		expect(specialMastery(state)).toMatchObject({ percent: 100, mastered: true });
		expect(scopeMastery(state, bundle, NATIONAL).mature).toBe(0);
	});
	test("level indicator is the share of learned region cards that passed each level", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ passedLevels: [true, true, false] }));
		seedCard(state, "bk::code2region", reviewCard({ passedLevels: [true, false, false] }));
		expect(levelIndicator(state)).toEqual({ 1: 100, 2: 50, 3: 0 });
		expect(levelIndicator(fresh())).toEqual({ 1: 0, 2: 0, 3: 0 });
	});
});
