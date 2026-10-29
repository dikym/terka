import { describe, expect, test } from "bun:test";
import { addDays, localDay } from "../../../src/core/time/day";
import { homeView } from "../../../src/lib/view/home";
import {
	DAY,
	intro,
	manyRegions,
	NOW,
	ruleBundle,
	run,
	stateOf,
	WITA
} from "../../core/replay/fixtures";
import { ctxAt, SETTINGS } from "../../core/session/fixtures";

const view = (events: Parameters<typeof stateOf>[0], settings = SETTINGS) =>
	homeView(stateOf(events), ruleBundle(), settings, ctxAt(NOW), "Tersimpan di perangkat ini");

describe("home view", () => {
	test("a new learner has nothing to review and new material waiting", () => {
		const home = view([]);
		expect(home.summary.due).toBe(0);
		expect(home.summary.newAvailable).toBeGreaterThan(0);
		expect(home.note).toBeNull();
		expect(home.week).toHaveLength(7);
		expect(home.week.at(-1)!.state).toBe("today");
		expect(home.challengeDone).toBe(false);
	});

	test("today's finished challenge marks the day and closes the button", () => {
		const home = view([intro("bk", NOW - DAY), run("challenge", NOW)]);
		expect(home.challengeDone).toBe(true);
		expect(home.week.at(-1)!.state).toBe("done");
		expect(home.summary.streak).toBe(1);
	});

	test("a completed daily session marks the day and counts for the streak", () => {
		const daily = run("daily", NOW, { plannedCount: 1 });
		const home = view([intro("bk", NOW + 1, { runId: daily.row.id }), daily]);
		expect(home.week.at(-1)!.state).toBe("done");
		expect(home.summary.streak).toBe(1);
		expect(home.challengeDone).toBe(false);
	});

	test("a long break with a backlog over the cap offers cek ingatan", () => {
		const many = manyRegions(40);
		const state = stateOf([], many);
		for (const cardId of [...state.cards.keys()].filter((id) => id.endsWith("::code2region")))
			state.cards.set(cardId, {
				...state.cards.get(cardId)!,
				state: "review",
				stability: 20,
				intervalDays: 20,
				lastReviewAt: NOW - 30 * DAY,
				due: NOW - DAY
			});
		state.activeDays.add(addDays(localDay(NOW, WITA), -8));
		const home = homeView(state, many, SETTINGS, ctxAt(NOW), "Tersimpan di perangkat ini");
		expect(home.summary.recheck).toBe(true);
		expect(view([]).summary.recheck).toBe(false);
	});

	test("a scope with everything introduced and nothing due is idle until the daily session is done", () => {
		const scope = { level: "province", id: "bali" } as const;
		const idle = view([intro("dk", NOW + 1)], { ...SETTINGS, scope });
		expect(idle.summary.allIntroduced).toBe(true);
		expect(idle.idle).toBe(true);
		expect(idle.finished).toBe(false);
	});

	describe("naming the new material", () => {
		const bali = { ...SETTINGS, scope: { level: "province", id: "bali" } as const };
		// DK was introduced two days ago and its reverse card has opened.
		const reverseOpen = () => {
			const state = stateOf([intro("dk", NOW - 2 * DAY)]);
			const card = state.cards.get("dk::region2code")!;
			state.cards.set(card.cardId, { ...card, state: "new" });
			return state;
		};
		const homeOf = (state: ReturnType<typeof stateOf>, settings = SETTINGS) =>
			homeView(state, ruleBundle(), settings, ctxAt(NOW), "Tersimpan di perangkat ini");

		test("codes nobody has seen are called new codes", () => {
			const home = view([]);
			expect(home.newLabel).toBe(`${home.summary.newAvailable} kode baru hari ini`);
			expect(home.newFromKnown).toBe(false);
		});
		test("reversed questions for known codes are not called new codes", () => {
			const home = homeOf(reverseOpen(), bali);
			expect(home.summary).toMatchObject({ allIntroduced: true, newAvailable: 1 });
			expect(home.newLabel).toBe("1 soal baru dari kode yang sudah dikenal");
			expect(home.newFromKnown).toBe(true);
			expect(home.note).toBeNull();
		});
		test("a mix of both is called new material", () => {
			const group = {
				...SETTINGS,
				scope: { level: "group", id: "bali-nusa-tenggara" } as const
			};
			const home = homeOf(reverseOpen(), group);
			expect(home.newLabel).toBe("3 materi baru hari ini");
			expect(home.newFromKnown).toBe(false);
		});
		test("nothing is named when no new material waits, and the note says every code is known", () => {
			const home = view([intro("dk", NOW + 1)], bali);
			expect(home.newLabel).toBeNull();
			expect(home.note).toBe("Semua kode di wilayah ini sudah diperkenalkan.");
		});
	});

	test("the day is finished only once the daily session is done and nothing is left", () => {
		const scope = { level: "province", id: "bali" } as const;
		const daily = run("daily", NOW, { plannedCount: 1 });
		const done = view([intro("dk", NOW + 1, { runId: daily.row.id }), daily], {
			...SETTINGS,
			scope
		});
		expect(done.finished).toBe(true);
		expect(done.idle).toBe(false);
	});

	test("a pair flagged both ways shows the direction still furthest from clearing", () => {
		const state = stateOf([]);
		const pair = { occurrences: [], flagged: true, cleared: false, drillDay: null };
		state.pairs.set("ba>bb", { ...pair, drillStreak: 4 });
		state.pairs.set("bb>ba", { ...pair, drillStreak: 1 });
		const home = homeView(
			state,
			ruleBundle(),
			SETTINGS,
			ctxAt(NOW),
			"Tersimpan di perangkat ini"
		);
		expect(home.pairs).toHaveLength(1);
		expect(home.pairs[0].streak).toBe(1);
	});

	test("a single missed day inside a streak shows as tolerance", () => {
		const today = localDay(NOW, WITA);
		const events = [3, 2, 0].map((back) => run("challenge", NOW - back * DAY));
		const home = view(events);
		const marks = Object.fromEntries(
			home.week.map((mark, index) => [addDays(today, index - 6), mark.state])
		);
		expect(marks[addDays(today, -1)]).toBe("tolerance");
		expect(marks[addDays(today, -2)]).toBe("done");
		expect(home.tolerance).toBe("Toleransi terpakai 1 dari 1 dalam 30 hari.");
	});

	test("the scope card lists the provinces of the chosen group", () => {
		const home = view([], {
			scope: { level: "group", id: "bali-nusa-tenggara" },
			specialEnabled: false
		});
		expect(home.scope.group).toBe("balinusra");
		expect(home.scope.title).toBe("Kawasan Bali & Nusa Tenggara");
		expect(home.scope.rows.map((row) => row.name)).toEqual(["Bali", "Nusa Tenggara Barat"]);
		expect(home.scope.rows[1].codes).toEqual(["DR", "EA"]);
	});

	test("flagged pairs carry their drill count", () => {
		const state = stateOf([]);
		state.pairs.set("be>bd", {
			occurrences: [],
			flagged: true,
			cleared: false,
			drillStreak: 3,
			drillDay: null
		});
		const home = homeView(
			state,
			ruleBundle(),
			SETTINGS,
			ctxAt(NOW),
			"Tersimpan di perangkat ini"
		);
		expect(home.pairs).toMatchObject([{ streak: 3 }]);
	});

	test("the countdown runs to the next midnight", () => {
		expect(view([]).challengeResetAt - NOW).toBe(DAY);
	});
});
