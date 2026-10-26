import { describe, expect, test } from "bun:test";
import { ladderScale } from "../../../src/core/questions/rung";
import { schedulerAt } from "../../../src/core/replay/params";
import { retrievability } from "../../../src/core/scheduling/fsrs";
import { rungMemory } from "../../../src/core/session/rung";
import { DAY, fresh, NOW, reviewCard, seedCard } from "../replay/fixtures";

describe("rung memory", () => {
	test("reads the card's recall chance and the user's ladder scale", () => {
		const state = fresh();
		state.levelTwoResults = Array.from({ length: 150 }, (_, index) => index % 10 !== 0);
		const card = seedCard(state, "dk::code2region", reviewCard());
		const at = NOW + 5 * DAY;
		const memory = rungMemory(state, card, at);
		expect(memory.retrievability).toBe(retrievability(schedulerAt(state.params, at), card, at));
		expect(memory.retrievability).toBeLessThan(1);
		expect(memory.scale).toBe(ladderScale(state.levelTwoResults));
		expect(memory.scale).toBeLessThan(1);
	});
});
