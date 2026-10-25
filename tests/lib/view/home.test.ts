import { describe, expect, test } from "bun:test";
import { addDays, localDay } from "../../../src/core/time/day";
import { homeView } from "../../../src/lib/view/home";
import { DAY, intro, NOW, ruleBundle, run, stateOf, WITA } from "../../core/replay/fixtures";
import { ctxAt, SETTINGS } from "../../core/session/fixtures";

const view = (events: Parameters<typeof stateOf>[0], settings = SETTINGS) =>
	homeView(stateOf(events), ruleBundle(), settings, ctxAt(NOW), "Tersimpan di perangkat ini");

describe("home view", () => {
	test("a new learner has nothing to review and new material waiting", () => {
		const home = view([]);
		expect(home.summary.due).toBe(0);
		expect(home.summary.newAvailable).toBeGreaterThan(0);
		expect(home.note).toBe("Tidak ada soal yang perlu diulang hari ini.");
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

	test("the countdown runs to the start of the next learning day", () => {
		expect(view([]).challengeResetAt - NOW).toBe(DAY);
	});
});
