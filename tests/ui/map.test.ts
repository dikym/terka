import { expect, test } from "bun:test";
import { fillStep, wheelZoom } from "../../src/components/ui/mastery-map";
import { mapProvinces } from "../../src/lib/view/map";
import { stateOf } from "../core/replay/fixtures";
import plates from "../../src/data/plates.json";
import type { Bundle } from "../../src/core/content/schema";

test("fill step follows the legend bands", () => {
	expect([null, 0, 1, 33, 34, 66, 67, 99, 100].map(fillStep)).toEqual([
		0, 1, 2, 2, 3, 3, 4, 4, 5
	]);
});

test("the shipped data covers every province in the map file", async () => {
	const bundle = plates as Bundle;
	const provinces = mapProvinces(stateOf([], bundle), bundle);
	const svg = await Bun.file("public/map.svg").text();
	const ids = [...svg.matchAll(/<path[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
	expect(ids.length).toBe(38);
	for (const id of ids) expect(provinces[id]).toBeDefined();
});

test("a mouse wheel notch zooms one level, animated", () => {
	expect(wheelZoom(-100, 0, false)).toEqual({ factor: 2, animate: true });
	expect(wheelZoom(100, 0, false)).toEqual({ factor: 0.5, animate: true });
	// Firefox counts a notch in lines.
	expect(wheelZoom(-3, 1, false)).toEqual({ factor: 2, animate: true });
});

test("a trackpad zooms continuously with the gesture", () => {
	const pinch = wheelZoom(-2, 0, true);
	expect(pinch.animate).toBe(false);
	expect(pinch.factor).toBeCloseTo(2 ** 0.02, 5);
	const swipe = wheelZoom(-6, 0, false);
	expect(swipe.animate).toBe(false);
	expect(swipe.factor).toBeCloseTo(2 ** 0.06, 5);
	// A full pinch of about 100 pixels doubles the scale, like one notch.
	expect(wheelZoom(-100, 0, true).factor).toBeCloseTo(2, 5);
});

test("a province counts its codes, not its cards", () => {
	const bundle = plates as unknown as Bundle;
	const state = stateOf([], bundle);
	const jawaBarat = bundle.regions.filter((region) => region.province === "jawa-barat");
	for (const region of jawaBarat)
		for (const mode of ["code2region", "region2code", "setrecall"]) {
			const card = state.cards.get(`${region.id}::${mode}`);
			if (card)
				state.cards.set(card.cardId, {
					...card,
					state: "mature",
					intervalDays: 30,
					passedLevel3: true
				});
		}
	const [first] = jawaBarat;
	const reverse = state.cards.get(`${first.id}::region2code`)!;
	state.cards.set(reverse.cardId, { ...reverse, state: "review", intervalDays: 3 });
	const province = mapProvinces(state, bundle)["jawa-barat"];
	expect(province.total).toBe(jawaBarat.length);
	expect(province.mastered).toBe(jawaBarat.length - 1);
});
