import { describe, expect, test } from "bun:test";
import { homeSummary } from "../../../src/core/views/home";
import { fresh, MINUTE, NOW, reviewCard, ruleBundle, seedCard } from "../replay/fixtures";
import { ctxAt, SETTINGS } from "../session/fixtures";

const bundle = ruleBundle();
const at = ctxAt(NOW + 3_600_000);
const BALI = { level: "province", id: "bali" } as const;

describe("home summary", () => {
	test("due work, new material and the next review time", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		seedCard(state, "bb::code2region", reviewCard({ due: NOW + 5 * 3_600_000 }));
		const home = homeSummary(state, bundle, SETTINGS, at);
		expect(home).toMatchObject({
			due: 1,
			newAvailable: 10,
			held: false,
			allIntroduced: false,
			nextDueAt: NOW + 5 * 3_600_000
		});
		expect(home.challenge).toBe("available");
		expect(home.placementOffer).toBe(true);
		expect(home.streak).toBe(0);
	});
	test("a scope whose material was all introduced says so", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 9 * 86_400_000 }));
		expect(homeSummary(state, bundle, { ...SETTINGS, scope: BALI }, at)).toMatchObject({
			allIntroduced: true,
			newAvailable: 0
		});
	});
	test("Kode diplomat count only when the path is on or special cards are learned", () => {
		const state = fresh();
		expect(homeSummary(state, bundle, SETTINGS, at).specialDue).toBeNull();
		expect(
			homeSummary(state, bundle, { ...SETTINGS, specialEnabled: true }, at).specialDue
		).toBe(0);
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		expect(homeSummary(state, bundle, SETTINGS, at).specialDue).toBe(1);
	});
	test("nothing learned: no next review and the challenge is empty", () => {
		expect(homeSummary(fresh(), bundle, SETTINGS, ctxAt(NOW + MINUTE))).toMatchObject({
			nextDueAt: null,
			challenge: "empty",
			due: 0
		});
	});
});
