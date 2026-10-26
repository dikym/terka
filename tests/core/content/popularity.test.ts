import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const popularity = (id: string) => plates.areas.find((area) => area.id === id)?.popularity;

describe("area popularity", () => {
	test("well-known areas rank above obscure ones", () => {
		expect(popularity("kota-surabaya")).toBe(1);
		expect(popularity("kab-badung")).toBe(1);
		expect(popularity("kota-pematangsiantar")).toBe(3);
	});

	test("every area has a tier and the tiers keep their sizes", () => {
		const counts: Record<number, number> = {};
		for (const area of plates.areas)
			counts[area.popularity] = (counts[area.popularity] ?? 0) + 1;
		expect(counts).toEqual({ 1: 20, 2: 50, 3: 123, 4: 145, 5: 176 });
	});
});
