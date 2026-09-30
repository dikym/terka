import { describe, expect, test } from "bun:test";
import { noteOffer, pendingNotices } from "../../../src/core/views/notices";
import { fresh, reviewCard, seedCard } from "../replay/fixtures";

describe("note offer after a jump in lapses", () => {
	test("once six was offered, four is never offered afterwards", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ lapses: 6 }));
		expect(noteOffer(state, "dk", false, [])).toBe(6);
		expect(noteOffer(state, "dk", false, [6])).toBeNull();
	});
});

describe("notices repeat for a new suspension of the same card", () => {
	test("a card suspended again after reactivation is announced again", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", {
			...reviewCard({ lapses: 8, reps: 20 }),
			state: "suspended",
			suspension: { reason: "leech", resume: "relearning" }
		});
		const [first] = pendingNotices(state, new Set(), 3);
		seedCard(state, "dk::code2region", {
			...reviewCard({ lapses: 8, reps: 31 }),
			state: "suspended",
			suspension: { reason: "leech", resume: "relearning" }
		});
		expect(pendingNotices(state, new Set([first.key]), 3)).toHaveLength(1);
	});
	test("a data drop in a later content revision is announced again", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		state.content.set("bk", "confidence");
		const [first] = pendingNotices(state, new Set(), 3);
		expect(pendingNotices(state, new Set([first.key]), 3)).toEqual([]);
		expect(pendingNotices(state, new Set([first.key]), 5)).toHaveLength(1);
	});
});
