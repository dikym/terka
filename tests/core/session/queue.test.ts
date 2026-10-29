import { describe, expect, test } from "bun:test";
import { schedulerAt } from "../../../src/core/replay/params";
import { retrievability } from "../../../src/core/scheduling/fsrs";
import { dailyQueue, dueReviewCount, specialQueue } from "../../../src/core/session/queue";
import { dayStats } from "../../../src/core/replay/days";
import { REVIEW_CAP_PER_DAY } from "../../../src/rules";
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
			drillStreak: 0,
			drillDay: null
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
	test("a pair drilled today is not drilled again today", () => {
		const state = fresh();
		seedCard(state, "be::code2region", reviewCard({ due: NOW + 5 * DAY }));
		state.pairs.set("be>bd", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 1,
			drillDay: TODAY
		});
		const { items } = dailyQueue(state, bundleOf(), SETTINGS, at);
		expect(items.some((item) => item.slot === "drill")).toBe(false);
	});
	test("a flagged pair with a special or unknown target is skipped", () => {
		const state = settle(fresh());
		seedCard(state, "bk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		state.pairs.set("bk>cd-49-jepang", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0,
			drillDay: null
		});
		state.pairs.set("bk>zz", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0,
			drillDay: null
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
	test("only cards of the scope are new; unlocked region2code outside it waits", () => {
		const state = fresh();
		seedCard(state, "dk::code2region", reviewCard({ due: NOW + 9 * DAY }));
		seedCard(state, "dk::region2code", { state: "new" });
		const queue = dailyQueue(state, bundleOf(), { ...SETTINGS, scope: SUMATERA }, at);
		expect(ids(queue.items.filter((item) => item.slot === "new"))).toEqual(
			["bk", "bb", "ba", "bm", "bp", "be", "bd"].map((code) => `${code}::code2region`)
		);
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

describe("one daily session a day", () => {
	const due = () => {
		const state = settle(fresh());
		seedCard(state, "bk::code2region", reviewCard());
		return state;
	};
	test("a completed daily session leaves nothing scheduled for the rest of the day", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		expect(dailyQueue(state, bundleOf(), SETTINGS, at).items.length).toBeGreaterThan(0);
		state.dailyDoneDays.add(TODAY);
		const queue = dailyQueue(state, bundleOf(), SETTINGS, at);
		expect(queue).toMatchObject({ items: [], held: false });
	});
	test("cards still due wait for the next day's session", () => {
		const state = due();
		state.dailyDoneDays.add(TODAY);
		const tomorrow = ctxAt(NOW + DAY + 2 * 3_600_000);
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, tomorrow).items)).toEqual([
			"bk::code2region"
		]);
	});
	test("a finished Cek Ingatan does not close the daily session", () => {
		const state = due();
		state.doneDays.add(TODAY);
		expect(ids(dailyQueue(state, bundleOf(), SETTINGS, at).items)).toEqual(["bk::code2region"]);
	});
	test("still counts the codes outside the scope that wait", () => {
		const state = fresh();
		state.dailyDoneDays.add(TODAY);
		const closed = dailyQueue(state, bundleOf(), { ...SETTINGS, scope: SUMATERA }, at);
		const open = dailyQueue(fresh(), bundleOf(), { ...SETTINGS, scope: SUMATERA }, at);
		expect(closed.outsideScopeNew).toBe(open.outsideScopeNew);
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

describe("daily review cap", () => {
	const backlog = (count: number) => {
		const bundle = manyRegions(count);
		const state = settle(fresh(bundle));
		for (let index = 0; index < count; index++)
			seedCard(state, `x${index}::code2region`, reviewCard({ stability: 5 + index }));
		return { bundle, state };
	};
	const reviews = (items: { slot: string; cardId: string }[]) =>
		items.filter((item) => item.slot === "review");

	test("no more than 30 reviews are queued, weakest first", () => {
		const { bundle, state } = backlog(45);
		const queued = reviews(dailyQueue(state, bundle, SETTINGS, at).items);
		expect(REVIEW_CAP_PER_DAY).toBe(30);
		expect(queued).toHaveLength(30);
		expect(ids(queued)).toEqual(
			Array.from({ length: 30 }, (_, index) => `x${index}::code2region`)
		);
	});
	test("answered reviews use up the day's cap", () => {
		const { bundle, state } = backlog(45);
		dayStats(state, TODAY).capped = 25;
		expect(reviews(dailyQueue(state, bundle, SETTINGS, at).items)).toHaveLength(5);
	});
	test("steps and drills are queued beyond the cap", () => {
		const { bundle, state } = backlog(45);
		dayStats(state, TODAY).capped = 30;
		seedCard(state, "dk::code2region", { state: "learning", step: 1, due: NOW - MINUTE });
		seedCard(state, "be::code2region", reviewCard({ due: NOW + 5 * DAY }));
		state.pairs.set("be>bd", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 0,
			drillDay: null
		});
		const items = dailyQueue(state, bundle, SETTINGS, at).items;
		expect(items.map((item) => item.slot)).toEqual(["step", "drill"]);
	});
	test("the uncapped count still sees the whole backlog", () => {
		const { bundle, state } = backlog(45);
		expect(dueReviewCount(state, at)).toBe(45);
		expect(bundle.regions.length).toBeGreaterThan(45);
	});
	test("new material stays held while the whole backlog is over the hold", () => {
		const { bundle, state } = backlog(45);
		expect(dailyQueue(state, bundle, SETTINGS, at).held).toBe(true);
	});
});

describe("backlog order after a recheck", () => {
	const mixed = (count: number) => {
		const bundle = manyRegions(count);
		const state = settle(fresh(bundle));
		for (let index = 0; index < count; index++)
			seedCard(state, `x${index}::code2region`, reviewCard({ stability: 5 + index }));
		seedCard(state, "dk::code2region", reviewCard({ stability: 500 }));
		return { bundle, state };
	};

	test("the weakest group's reviews go first while the backlog is over the cap", () => {
		const { bundle, state } = mixed(40);
		state.recheck = {
			key: TODAY,
			day: TODAY,
			results: new Map([
				["dk", false],
				["x0", true]
			])
		};
		const queued = ids(dailyQueue(state, bundle, SETTINGS, at).items);
		expect(queued[0]).toBe("dk::code2region");
	});
	test("the recheck order lapses once the backlog fits the cap", () => {
		const { bundle, state } = mixed(20);
		state.recheck = {
			key: TODAY,
			day: TODAY,
			results: new Map([
				["dk", false],
				["x0", true]
			])
		};
		const queued = ids(dailyQueue(state, bundle, SETTINGS, at).items);
		expect(queued.at(-1)).toBe("dk::code2region");
	});
});

describe("backlog order after a recheck, at the edges", () => {
	test("groups the recheck did not reach come after scored ones, in recall order", () => {
		const bundle = manyRegions(40);
		const state = settle(fresh(bundle));
		for (let index = 0; index < 40; index++)
			seedCard(state, `x${index}::code2region`, reviewCard({ stability: 5 + index }));
		seedCard(state, "dk::code2region", reviewCard({ stability: 1 }));
		seedCard(state, "a::code2region", reviewCard({ stability: 2 }));
		state.recheck = { key: TODAY, day: TODAY, results: new Map([["x3", false]]) };
		const queued = ids(dailyQueue(state, bundle, SETTINGS, at).items);
		expect(queued.slice(0, 3)).toEqual([
			"x0::code2region",
			"x1::code2region",
			"x2::code2region"
		]);
		expect(queued).not.toContain("dk::code2region");
		expect(queued).toHaveLength(30);
	});
	test("a recheck whose codes are no longer in the bundle changes nothing", () => {
		const bundle = manyRegions(40);
		const state = settle(fresh(bundle));
		for (let index = 0; index < 40; index++)
			seedCard(state, `x${index}::code2region`, reviewCard({ stability: 5 + index }));
		const before = ids(dailyQueue(state, bundle, SETTINGS, at).items);
		state.recheck = { key: TODAY, day: TODAY, results: new Map([["gone", false]]) };
		expect(ids(dailyQueue(state, bundle, SETTINGS, at).items)).toEqual(before);
	});
});

describe("stale recheck results", () => {
	test("a recheck from before a later long break no longer orders the backlog", () => {
		const bundle = manyRegions(40);
		const state = settle(fresh(bundle));
		for (let index = 0; index < 40; index++)
			seedCard(state, `x${index}::code2region`, reviewCard({ stability: 5 + index }));
		seedCard(state, "dk::code2region", reviewCard({ stability: 500 }));
		const old = addDays(TODAY, -60);
		state.recheck = { key: "old-run", day: old, results: new Map([["dk", false]]) };
		state.activeDays.add(old);
		state.activeDays.add(addDays(TODAY, -40));
		const queued = ids(dailyQueue(state, bundle, SETTINGS, at).items);
		expect(queued[0]).toBe("x0::code2region");
	});
});
