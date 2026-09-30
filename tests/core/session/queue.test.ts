import { describe, expect, test } from "bun:test";
import { schedulerAt } from "../../../src/core/replay/params";
import { retrievability } from "../../../src/core/scheduling/fsrs";
import { dailyQueue, specialQueue } from "../../../src/core/session/queue";
import { addDays } from "../../../src/core/time/day";
import {
	DAY,
	fresh,
	manyRegions,
	MINUTE,
	NOW,
	reviewCard,
	ruleBundle,
	seedCard
} from "../replay/fixtures";
import { ctxAt, SETTINGS, SUMATERA } from "./fixtures";

const TODAY = "2026-09-21";
const at = ctxAt(NOW + 2 * 3_600_000);
const ids = (items: { cardId: string }[]) => items.map((item) => item.cardId);
const bundleOf = () => ruleBundle();
const settle = (state: ReturnType<typeof fresh>) => {
	for (const cardId of state.cards.keys())
		if (state.cards.get(cardId)!.state === "new") seedCard(state, cardId, { state: "locked" });
	return state;
};

describe("daily queue order", () => {
	test("steps, then drills, then reviews, then new material", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", { state: "learning", step: 1, due: NOW - MINUTE });
		seedCard(state, "be::code2region", reviewCard({ due: NOW + 5 * DAY }));
		state.pairs.set("be>bd", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0
		});
		seedCard(state, "bk::code2region", reviewCard());
		const { items } = dailyQueue(state, bundleOf(), SETTINGS, at);
		expect(items.slice(0, 3).map((item) => `${item.cardId}:${item.slot}`)).toEqual([
			"dk::code2region:step",
			"be::code2region:drill",
			"bk::code2region:review"
		]);
		expect(items[1].drillPair).toBe("bd");
		expect(
			items.slice(3).every((item) => item.slot === "new" && item.context === "intro")
		).toBe(true);
	});
	test("reviews come lowest recall probability first", () => {
		const state = settle(fresh());
		seedCard(state, "bk::code2region", reviewCard({ stability: 5 }));
		seedCard(state, "bb::code2region", reviewCard({ stability: 60 }));
		seedCard(state, "ba::code2region", reviewCard({ stability: 15 }));
		const scheduler = schedulerAt(state.params, at.now);
		const r = ids(dailyQueue(state, bundleOf(), SETTINGS, at).items).map((cardId) =>
			retrievability(scheduler, state.cards.get(cardId)!, at.now)
		);
		expect(r).toEqual([...r].sort((a, b) => a - b));
		expect(r).toHaveLength(3);
	});
	test("only the related card with the lowest recall is served", () => {
		const state = settle(fresh());
		seedCard(state, "dk::code2region", reviewCard({ stability: 5 }));
		seedCard(state, "dk::region2code", reviewCard({ stability: 60 }));
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, at).items)).toEqual(["dk::code2region"]);
	});
	test("a related card skipped two days in a row goes first on the third", () => {
		const state = settle(fresh());
		seedCard(state, "dk::code2region", reviewCard({ stability: 5 }));
		seedCard(state, "dk::region2code", reviewCard({ stability: 60, relatedSkips: 2 }));
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, at).items)).toEqual(["dk::region2code"]);
	});
	test("a group that already used today's scheduled answer is skipped", () => {
		const state = settle(fresh());
		seedCard(state, "dk::region2code", reviewCard());
		state.groupDay.set("dk", TODAY);
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toEqual([]);
	});
	test("a learning step and a related review can both be served", () => {
		const state = settle(fresh());
		seedCard(state, "dk::code2region", { state: "learning", step: 1, due: NOW });
		seedCard(state, "dk::region2code", reviewCard());
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, at).items).sort()).toEqual([
			"dk::code2region",
			"dk::region2code"
		]);
	});
	test("nothing due and nothing new gives an empty queue", () => {
		expect(dailyQueue(settle(fresh()), bundleOf(), SETTINGS, at).items).toEqual([]);
	});
	test("a due card whose data dropped below high is not queued", () => {
		const state = settle(fresh());
		seedCard(state, "bk::code2region", reviewCard());
		state.content.set("bk", "confidence");
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toEqual([]);
	});
	test("a flagged pair with a special or unknown target is skipped", () => {
		const state = settle(fresh());
		seedCard(state, "bk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		state.pairs.set("bk>cd-49-jepang", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0
		});
		state.pairs.set("bk>zz", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0
		});
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toEqual([]);
	});
	test("setrecall and special cards never enter the daily queue", () => {
		const state = settle(fresh());
		seedCard(state, "dk::setrecall", reviewCard());
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toEqual([]);
	});
});

describe("new material", () => {
	test("41 due items hold new material, 40 do not", () => {
		for (const [due, held] of [
			[41, true],
			[40, false]
		] as const) {
			const state = fresh(manyRegions(45));
			for (let index = 0; index < due; index++)
				seedCard(state, `x${index}::code2region`, reviewCard());
			const queue = dailyQueue(state, manyRegions(45), SETTINGS, at);
			expect(queue.held).toBe(held);
			expect(queue.items.some((item) => item.slot === "new")).toBe(!held);
		}
	});
	test("the daily limit follows the tier and survives a scope change", () => {
		const state = fresh();
		state.quota.set(`region|${TODAY}`, 7);
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toHaveLength(3);
		expect(
			dailyQueue(state, bundleOf(), { ...SETTINGS, scope: SUMATERA }, at).items
		).toHaveLength(3);
		state.tier.current = "pemula";
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items).toHaveLength(1);
	});
	test("only code2region of the scope is new; unlocked region2code comes from any code", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 9 * DAY }));
		seedCard(state, "dk::region2code", { state: "new" });
		const queue = dailyQueue(state, bundleOf(), { ...SETTINGS, scope: SUMATERA }, at);
		expect(ids(queue.items.filter((item) => item.slot === "new"))).toEqual([
			...["bk", "bb", "ba", "bm", "bp", "be", "bd"].map((code) => `${code}::code2region`),
			"dk::region2code"
		]);
		expect(queue.outsideScopeNew).toBe(8);
	});
	test("at most one introduction per related group per day", () => {
		const state = fresh();
		seedCard(state, "dk::region2code", { state: "new" });
		state.sightings.set("dk", [TODAY]);
		const intros = dailyQueue(state, bundleOf(), SETTINGS, at).items.filter((item) =>
			item.cardId.startsWith("dk::")
		);
		expect(intros).toHaveLength(1);
		state.introDay.set("dk", TODAY);
		expect(
			dailyQueue(state, bundleOf(), SETTINGS, at).items.some((item) =>
				item.cardId.startsWith("dk::")
			)
		).toBe(false);
	});
	test("codes looked up in the last 90 days come first, then data order", () => {
		const state = fresh();
		state.sightings.set("bm", [TODAY, addDays(TODAY, -3)]);
		state.sightings.set("ba", [addDays(TODAY, -89)]);
		state.sightings.set("bb", [addDays(TODAY, -90), addDays(TODAY, -95)]);
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, at).items).slice(0, 4)).toEqual([
			"bm::code2region",
			"ba::code2region",
			"bk::code2region",
			"bb::code2region"
		]);
	});
});

describe("Kode Khusus queue", () => {
	test("switched off: no new special cards, but due ones still come", () => {
		const state = fresh();
		expect(specialQueue(state, bundleOf(), SETTINGS, at).items).toEqual([]);
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		expect(ids(specialQueue(state, bundleOf(), SETTINGS, at).items)).toEqual([
			"cd-49-jepang::special2holder"
		]);
	});
	test("switched on: five new cards a day, in CD number order, whatever the region quota", () => {
		const state = fresh();
		state.quota.set(`region|${TODAY}`, 10);
		const items = specialQueue(
			state,
			bundleOf(),
			{ ...SETTINGS, specialEnabled: true },
			at
		).items;
		expect(ids(items)).toEqual([
			"cd-12-amerika-serikat::special2holder",
			"cd-17-vatikan::special2holder",
			"cd-20-irak::special2holder",
			"cd-45-iran::special2holder",
			"cd-48-turki::special2holder"
		]);
	});
	test("26 due special cards hold new special material, 25 do not", () => {
		for (const [due, held] of [
			[26, true],
			[25, false]
		] as const) {
			const bundle = bundleOf();
			for (let index = 0; index < 26; index++)
				bundle.specials.push({
					...bundle.specials[0],
					id: `cd-${200 + index}-x`,
					number: String(200 + index)
				});
			const state = fresh(bundle);
			for (let index = 0; index < due; index++)
				seedCard(state, `cd-${200 + index}-x::special2holder`, reviewCard());
			expect(
				specialQueue(state, bundle, { ...SETTINGS, specialEnabled: true }, at).held
			).toBe(held);
		}
	});
	test("two related special cards due the same day: only one is served", () => {
		const state = fresh();
		seedCard(state, "cd-49-jepang::special2holder", reviewCard({ stability: 5 }));
		seedCard(state, "cd-49-jepang::holder2special", reviewCard({ stability: 60 }));
		expect(ids(specialQueue(state, bundleOf(), SETTINGS, at).items)).toEqual([
			"cd-49-jepang::special2holder"
		]);
	});
});
