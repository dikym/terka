import { describe, expect, test } from "bun:test";
import { forecast, hardCards, sightingCounts, weakestCards } from "../../../src/core/views/stats";
import { DAY, fresh, NOW, reviewCard, seedCard } from "../replay/fixtures";
import { ctxAt } from "../session/fixtures";

const at = ctxAt(NOW + 3_600_000);

describe("forecast", () => {
	test("fourteen days; overdue cards count toward today", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard({ due: NOW - 3 * DAY }));
		seedCard(state, "bb::code2region", reviewCard({ due: NOW + 2 * DAY }));
		seedCard(state, "dk::setrecall", reviewCard({ due: NOW + 2 * DAY }));
		seedCard(state, "cd-49-jepang::special2holder", reviewCard({ due: NOW + 20 * DAY }));
		const rows = forecast(state, at);
		expect(rows).toHaveLength(14);
		expect(rows[0]).toEqual({ localDay: "2026-09-21", due: 1 });
		expect(rows[2]).toEqual({ localDay: "2026-09-23", due: 2 });
		expect(rows.reduce((sum, row) => sum + row.due, 0)).toBe(3);
	});
	test("nothing learned still gives fourteen empty days", () => {
		const rows = forecast(fresh(), at);
		expect(rows).toHaveLength(14);
		expect(rows.every((row) => row.due === 0)).toBe(true);
	});
});

describe("card lists", () => {
	test("most-missed cards order by wrong answers, then lapses", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard({ wrong: 3, answered: 9, lapses: 1 }));
		seedCard(state, "bb::code2region", reviewCard({ wrong: 3, answered: 5, lapses: 2 }));
		seedCard(state, "ba::code2region", reviewCard({ wrong: 5, answered: 6 }));
		expect(weakestCards(state).map((card) => card.cardId)).toEqual([
			"ba::code2region",
			"bb::code2region",
			"bk::code2region"
		]);
		expect(weakestCards(state, 1)).toHaveLength(1);
	});
	test("Sulit Dikuasai lists cards at six lapses or more, including suspended ones to review", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard({ lapses: 6 }));
		seedCard(state, "bb::code2region", {
			...reviewCard({ lapses: 8 }),
			state: "suspended",
			suspension: { reason: "leech", resume: "relearning" }
		});
		seedCard(state, "ba::code2region", reviewCard({ lapses: 5 }));
		expect(hardCards(state)).toEqual([
			{ cardId: "bb::code2region", lapses: 8, suspended: true },
			{ cardId: "bk::code2region", lapses: 6, suspended: false }
		]);
	});
	test("lookups count only inside 90 days", () => {
		const state = fresh();
		state.sightings.set("dr", ["2026-09-20", "2026-06-24", "2026-06-23"]);
		expect(sightingCounts(state, "2026-09-21").get("dr")).toBe(2);
	});
});
