import { describe, expect, test } from "bun:test";
import { seeded, shuffle } from "../../../src/core/random";

describe("seeded random", () => {
	test("the same seed gives the same stream; values stay in [0, 1)", () => {
		const a = seeded("dk::code2region:3:order");
		const b = seeded("dk::code2region:3:order");
		const values = Array.from({ length: 50 }, () => a());
		expect(values).toEqual(Array.from({ length: 50 }, () => b()));
		expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
		expect(seeded("x")()).not.toBe(seeded("y")());
	});
	test("shuffle keeps every item and is deterministic", () => {
		const items = ["a", "b", "c", "d", "e"];
		const first = shuffle(items, seeded("s"));
		expect([...first].sort()).toEqual(items);
		expect(shuffle(items, seeded("s"))).toEqual(first);
		expect(items).toEqual(["a", "b", "c", "d", "e"]);
	});
});
