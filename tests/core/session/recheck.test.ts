import { describe, expect, test } from "bun:test";
import type { Bundle } from "../../../src/core/content/schema";
import { schedulerAt } from "../../../src/core/replay/params";
import type { AppState } from "../../../src/core/replay/state";
import { retrievability } from "../../../src/core/scheduling/fsrs";
import { contentOf } from "../../../src/core/session/context";
import { recheckOffer, recheckQueue } from "../../../src/core/session/recheck";
import { addDays, localDay } from "../../../src/core/time/day";
import { RECHECK_AWAY_DAYS, RECHECK_SIZE } from "../../../src/rules";
import {
	DAY,
	fresh,
	intro,
	NOW,
	review,
	reviewCard,
	ruleBundle,
	seedCard,
	stateOf,
	WITA
} from "../replay/fixtures";
import { ctxAt } from "./fixtures";

const TODAY = localDay(NOW, WITA);
const at = ctxAt(NOW + 2 * 3_600_000);

// Adds copies of a group's first region so the group has `count` codes in all.
function grow(bundle: Bundle, group: string, count: number) {
	const source = bundle.regions.find((region) => region.group === group)!;
	const have = bundle.regions.filter((region) => region.group === group).length;
	for (let index = have; index < count; index++)
		bundle.regions.push({ ...source, id: `${group.slice(0, 3)}${index}` });
}

function backlog(bundle: Bundle, groups: string[]) {
	const state = fresh(bundle);
	const ids = bundle.regions
		.filter((region) => groups.includes(region.group))
		.map((region) => region.id);
	ids.forEach((id, index) =>
		seedCard(state, `${id}::code2region`, reviewCard({ stability: 5 + index }))
	);
	return { state, ids };
}

const away = (state: AppState, days = RECHECK_AWAY_DAYS) => {
	state.activeDays.add(addDays(TODAY, -days));
	return state;
};

describe("recheck offer", () => {
	const bundle = ruleBundle();
	grow(bundle, "sumatera", 20);
	grow(bundle, "jawa", 20);

	test("offered after seven idle days with more than 30 due", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa"]);
		expect(recheckOffer(away(state), at)).toBe(true);
	});
	test("not offered after six idle days", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa"]);
		expect(recheckOffer(away(state, RECHECK_AWAY_DAYS - 1), at)).toBe(false);
	});
	test("not offered with exactly 30 due", () => {
		const small = ruleBundle();
		grow(small, "sumatera", 30);
		const { state } = backlog(small, ["sumatera"]);
		expect(recheckOffer(away(state), at)).toBe(false);
	});
	test("not offered once the user has answered today", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa"]);
		away(state).activeDays.add(TODAY);
		expect(recheckOffer(state, at)).toBe(false);
	});
	test("not offered to someone who has never practised", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa"]);
		expect(recheckOffer(state, at)).toBe(false);
	});
});

describe("recheck queue", () => {
	const bundle = ruleBundle();
	grow(bundle, "sumatera", 20);
	grow(bundle, "jawa", 20);
	const groupOf = new Map(bundle.regions.map((region) => [region.id, region.group]));

	test("twenty items split across the groups with due cards, spare slots move on", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa", "bali-nusa-tenggara"]);
		const { items } = recheckQueue(state, bundle, at);
		expect(items).toHaveLength(RECHECK_SIZE);
		const counts: Record<string, number> = {};
		for (const item of items) {
			const group = groupOf.get(contentOf(item.cardId))!;
			counts[group] = (counts[group] ?? 0) + 1;
		}
		expect(counts).toEqual({ sumatera: 9, jawa: 8, "bali-nusa-tenggara": 3 });
		expect(items.every((item) => item.context === "recheck" && item.slot === "review")).toBe(
			true
		);
	});
	test("within a group the weakest cards are picked", () => {
		const { state, ids } = backlog(bundle, ["sumatera"]);
		const { items } = recheckQueue(state, bundle, at);
		expect(items.map((item) => contentOf(item.cardId))).toEqual(ids.slice(0, RECHECK_SIZE));
	});
	test("only cards already due are asked", () => {
		const { state } = backlog(bundle, ["bali-nusa-tenggara"]);
		seedCard(state, "bk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		const { items } = recheckQueue(state, bundle, at);
		expect(items.map((item) => item.cardId)).not.toContain("bk::code2region");
	});
	test("predicted recall is the mean R of the picked cards per group", () => {
		const { state } = backlog(bundle, ["sumatera", "jawa"]);
		const { items, predicted } = recheckQueue(state, bundle, at);
		const scheduler = schedulerAt(state.params, at.now);
		const jawa = items
			.filter((item) => groupOf.get(contentOf(item.cardId)) === "jawa")
			.map((item) => retrievability(scheduler, state.cards.get(item.cardId)!, at.now));
		const mean = jawa.reduce((sum, r) => sum + r, 0) / jawa.length;
		expect(predicted.get("jawa")).toBeCloseTo(mean, 10);
	});
});

describe("recheck answers", () => {
	test("reschedule the card like a daily review", () => {
		const base = [intro("dk", NOW), review("dk", "code2region", NOW + 30_000)];
		const later = NOW + 10 * DAY;
		const card = (context: "recheck" | "daily") =>
			stateOf([...base, review("dk", "code2region", later, { context })]).cards.get(
				"dk::code2region"
			)!;
		// Fuzz is seeded by the answer id, so only the memory, not the exact day, can be compared.
		const { stability, difficulty, state, lastReviewAt } = card("daily");
		expect(card("recheck")).toMatchObject({ stability, difficulty, state, lastReviewAt });
		expect(lastReviewAt).toBe(later);
	});
	test("the first answer per code on the recheck day is kept as its result", () => {
		const later = NOW + 10 * DAY;
		const state = stateOf([
			intro("dk", NOW),
			review("dk", "code2region", NOW + 30_000),
			review("dk", "code2region", later, { context: "recheck", correct: false })
		]);
		expect(state.recheck?.day).toBe(localDay(later, WITA));
		expect(state.recheck?.results.get("dk")).toBe(false);
	});
});

describe("recheck at the edges", () => {
	const bundle = ruleBundle();

	test("fewer due cards than slots asks every one of them", () => {
		const { state, ids } = backlog(bundle, ["bali-nusa-tenggara"]);
		expect(recheckQueue(state, bundle, at).items).toHaveLength(ids.length);
	});
	test("nothing due gives an empty test with no predictions", () => {
		const { items, predicted } = recheckQueue(fresh(bundle), bundle, at);
		expect(items).toEqual([]);
		expect(predicted.size).toBe(0);
	});
	test("a code with both directions due is asked once", () => {
		const state = fresh(bundle);
		seedCard(state, "dk::code2region", reviewCard({ stability: 5 }));
		seedCard(state, "dk::region2code", reviewCard({ stability: 6 }));
		const { items } = recheckQueue(state, bundle, at);
		expect(items.map((item) => contentOf(item.cardId))).toEqual(["dk"]);
	});
	test("a learning card is not part of the test", () => {
		const state = fresh(bundle);
		seedCard(state, "dk::code2region", { state: "learning", step: 1, due: NOW - DAY });
		expect(recheckQueue(state, bundle, at).items).toEqual([]);
	});
});
