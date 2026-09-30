import { describe, expect, test } from "bun:test";
import { newEntry } from "../../../src/core/replay/state";
import { effectiveCard, universe } from "../../../src/core/replay/universe";
import { fresh, ruleBundle } from "./fixtures";

describe("card universe", () => {
	const cards = new Map(universe(ruleBundle()).map((card) => [card.cardId, card.locked]));
	test("each high code gives code2region open and region2code locked", () => {
		expect(cards.get("dk::code2region")).toBe(false);
		expect(cards.get("dk::region2code")).toBe(true);
	});
	test("setrecall exists only for codes with at least three high areas", () => {
		expect(cards.get("dk::setrecall")).toBe(true);
		expect(cards.has("bb::setrecall")).toBe(false);
		expect(cards.has("db::setrecall")).toBe(false);
	});
	test("special cards come only from high entries", () => {
		expect(cards.get("cd-49-jepang::special2holder")).toBe(false);
		expect(cards.get("cd-49-jepang::holder2special")).toBe(true);
		expect(cards.has("cd-119-contohland::special2holder")).toBe(false);
	});
	test("state starts with every universe card", () => {
		const state = fresh();
		expect(state.cards.get("dk::code2region")?.state).toBe("new");
		expect(state.cards.get("dk::region2code")?.state).toBe("locked");
		expect(state.tier.current).toBe("menengah");
	});
});

describe("content overlay", () => {
	test("a code that dropped below high reads as suspended while its stored card is untouched", () => {
		const bundle = ruleBundle();
		bundle.regions.find((region) => region.id === "dk")!.confidence = "medium";
		const state = fresh(bundle);
		state.cards.set("dk::code2region", newEntry("dk::code2region"));
		expect(effectiveCard(state, "dk::code2region")).toMatchObject({
			state: "suspended",
			suspension: { reason: "confidence", resume: "new" }
		});
		expect(state.cards.get("dk::code2region")?.state).toBe("new");
	});
	test("a code missing from the data reads as suspended for missing data", () => {
		const state = fresh();
		state.content.delete("dk");
		expect(effectiveCard(state, "dk::code2region")?.suspension?.reason).toBe("missing-data");
	});
	test("healthy content returns the stored card", () => {
		const state = fresh();
		expect(effectiveCard(state, "dk::code2region")).toBe(state.cards.get("dk::code2region"));
	});
});
