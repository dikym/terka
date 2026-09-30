import { describe, expect, test } from "bun:test";
import { seeded } from "../../../src/core/random";
import { cardsWhere, isGroupA, prepare, uniqueItems } from "../../../src/core/session/context";
import { pickFormat } from "../../../src/core/session/forms";
import { uuidV7 } from "../../../src/core/session/ids";
import { fresh, NOW } from "../replay/fixtures";
import { ctxAt } from "./fixtures";

describe("event ids", () => {
	test("ids are UUID version 7 and sort by time", () => {
		const random = seeded("ids");
		const first = uuidV7(NOW, random);
		const later = uuidV7(NOW + 1, random);
		expect(first).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
		);
		expect(first < later).toBe(true);
	});
});

describe("session helpers", () => {
	test("prepare brings the state to the caller's day without changing the input", () => {
		const state = fresh();
		const ready = prepare(state, ctxAt(NOW));
		expect(ready.currentDay).toBe("2026-09-21");
		expect(state.currentDay).toBeNull();
	});
	test("cards are read through the content overlay, in card id order", () => {
		const state = fresh();
		state.content.set("bk", "confidence");
		const cards = cardsWhere(state, isGroupA);
		expect(cards.map((card) => card.cardId)).toEqual(
			[...cards.map((card) => card.cardId)].sort()
		);
		expect(cards.find((card) => card.cardId === "bk::code2region")?.state).toBe("suspended");
	});
	test("a card appears once, at its first position", () => {
		const items = uniqueItems([
			{ cardId: "a", context: "drill", slot: "drill" },
			{ cardId: "b", context: "daily", slot: "review" },
			{ cardId: "a", context: "daily", slot: "review" }
		]);
		expect(items.map((item) => `${item.cardId}:${item.slot}`)).toEqual(["a:drill", "b:review"]);
	});
});

describe("Level 1 form", () => {
	test("introductions and non-code2region cards always use multiple choice", () => {
		expect(pickFormat("dk::code2region", "s", "intro")).toBe("choice");
		expect(pickFormat("dk::region2code", "s", "daily")).toBe("choice");
		expect(pickFormat("cd-49-jepang::special2holder", "s", "special")).toBe("choice");
	});
	test("code2region spreads over the three forms, the same way for the same seed", () => {
		const forms = new Set(
			Array.from({ length: 60 }, (_, index) =>
				pickFormat("dk::code2region", `dk:${index}`, "daily")
			)
		);
		expect(forms).toEqual(new Set(["choice", "truefalse", "oddoneout"]));
		expect(pickFormat("dk::code2region", "dk:7", "kilat")).toBe(
			pickFormat("dk::code2region", "dk:7", "kilat")
		);
	});
});
