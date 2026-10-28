import { describe, expect, test } from "bun:test";
import { hardCardList, statsView } from "../../../src/lib/view/stats";
import { DAY, intro, NOW, review, ruleBundle, stateOf } from "../../core/replay/fixtures";
import { ctxAt } from "../../core/session/fixtures";

const bundle = ruleBundle();
const view = (events: Parameters<typeof stateOf>[0]) =>
	statsView(stateOf(events), bundle, ctxAt(NOW));

describe("statistics view", () => {
	test("a new learner sees empty statistics", () => {
		const stats = view([]);
		expect(stats.national.percent).toBe("0%");
		expect(stats.national.codes).toBe(`0 dari ${bundle.regions.length}`);
		expect(stats.weakest).toEqual([]);
		expect(stats.hard).toEqual([]);
		expect(stats.forecast.days).toHaveLength(14);
		expect(stats.forecast.days[0].slice(0, 2)).toEqual(["Hari", "ini"]);
		expect(stats.forecast.title).toBe("Belum ada soal terjadwal");
		expect(stats.diplomat.started).toBe(false);
	});

	test("an introduced diplomat code starts the diplomat track", () => {
		const stats = view([intro("cd-49-jepang", NOW, { mode: "special2holder" })]);
		expect(stats.diplomat.started).toBe(true);
	});

	test("a missed answer puts its code among the weakest", () => {
		const stats = view([
			intro("bk", NOW - 2 * DAY),
			review("bk", "code2region", NOW - 2 * DAY + 60_000, { correct: false })
		]);
		expect(stats.weakest).toHaveLength(1);
		expect(stats.weakest[0]).toMatchObject({ code: "BK", group: "sumatera", right: 0, of: 1 });
		expect(stats.weakest[0].areas).toBe("Kota Medan, Kota Binjai, dan 3 lainnya");
		expect(stats.weakest[0].allAreas.split(", ")).toHaveLength(5);
		expect(stats.weakest[0].allAreas).toStartWith("Kota Medan, Kota Binjai, ");
	});

	test("the hard list starts empty", () => {
		expect(hardCardList(stateOf([]), bundle)).toEqual([]);
	});
});
