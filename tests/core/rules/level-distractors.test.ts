import { describe, expect, test } from "bun:test";
import { areaDisplayName } from "../../../src/core/answers/dictionary";
import type { Area, Bundle } from "../../../src/core/content/schema";
import {
	foreignAreas,
	NATIONAL,
	otherCodes,
	specialChoices
} from "../../../src/core/questions/distractors";
import { automaticLevel, resolveLevel } from "../../../src/core/questions/level";
import { parseCardId } from "../../../src/core/questions/question";
import { seeded } from "../../../src/core/random";
import { newCard } from "../../../src/core/scheduling/card-memory";
import { ruleBundle } from "./fixtures";

const bundle = ruleBundle();
const region = (id: string) => bundle.regions.find((item) => item.id === id)!;
const card = (state: "new" | "learning" | "review" | "relearning" | "mature", extra = {}) => ({
	...newCard("bk::code2region"),
	state,
	...extra
});

describe("automatic level (SRD 3.2)", () => {
	test("SR-018/SR-023/SR-340: the table in order", () => {
		expect(automaticLevel(card("review"), "code2region", "intro")).toBe(1);
		expect(automaticLevel(card("new"), "code2region", "drill")).toBe(3);
		expect(automaticLevel(card("mature"), "code2region", "kilat")).toBe(1);
		expect(automaticLevel(card("new"), "code2region", "placement")).toBe(2);
		expect(automaticLevel(card("learning"), "setrecall", "setrecall")).toBe(3);
		expect(automaticLevel(card("new"), "code2region", "daily")).toBe(1);
		expect(automaticLevel(card("learning"), "code2region", "daily")).toBe(1);
		expect(automaticLevel(card("review", { intervalDays: 20 }), "code2region", "daily")).toBe(
			2
		);
		expect(automaticLevel(card("review", { intervalDays: 21 }), "code2region", "daily")).toBe(
			3
		);
		expect(
			automaticLevel(
				card("review", { intervalDays: 25, passedLevel3: true }),
				"code2region",
				"daily"
			)
		).toBe(2);
		expect(
			automaticLevel(card("relearning", { intervalDays: 30 }), "code2region", "daily")
		).toBe(2);
		expect(automaticLevel(card("mature"), "holder2special", "special")).toBe(3);
	});
	test("SR-019/SR-020: manual levels are recorded; fixed contexts refuse them", () => {
		expect(resolveLevel(2, 3, "daily")).toEqual({ level: 3, levelSource: "manual_up" });
		expect(resolveLevel(3, 1, "daily")).toEqual({ level: 1, levelSource: "manual_down" });
		expect(resolveLevel(2, undefined, "daily")).toEqual({ level: 2, levelSource: "auto" });
		expect(resolveLevel(2, 2, "daily")).toEqual({ level: 2, levelSource: "auto" });
		for (const context of ["intro", "drill", "kilat", "placement"] as const)
			expect(() => resolveLevel(1, 2, context)).toThrow("fixed");
	});
	test("card ids parse into content id and mode", () => {
		expect(parseCardId("cd-49-jepang::holder2special")).toEqual({
			contentId: "cd-49-jepang",
			mode: "holder2special"
		});
		expect(() => parseCardId("bk::blindrecall")).toThrow();
		expect(() => parseCardId("bk")).toThrow();
	});
});

describe("distractor sources (SRD 2.8, 2.9)", () => {
	const members = (id: string) =>
		new Set(region(id).areas.map((membership) => membership.areaId));
	test("SR-022/SR-218: scope areas first, never a member of the asked code", () => {
		for (let seed = 0; seed < 10; seed++) {
			const picked = foreignAreas(
				bundle,
				region("bk"),
				{ level: "group", id: "sumatera" },
				3,
				seeded(`s${seed}`)
			);
			expect(picked).toHaveLength(3);
			expect(
				picked.every(
					({ owner, area }) => owner.group === "sumatera" && !members("bk").has(area.id)
				)
			).toBe(true);
			expect(new Set(picked.map(({ area }) => areaDisplayName(area))).size).toBe(3);
		}
	});
	test("SR-219: a card outside the scope starts from its own group", () => {
		const picked = foreignAreas(
			bundle,
			region("dk"),
			{ level: "group", id: "sumatera" },
			3,
			seeded("x")
		);
		expect(picked.every(({ owner }) => owner.group === "bali-nusa-tenggara")).toBe(true);
	});
	test("SR-220/SR-297: a thin group widens to national", () => {
		const picked = foreignAreas(
			bundle,
			region("db"),
			{ level: "group", id: "sulawesi" },
			3,
			seeded("y")
		);
		expect(picked).toHaveLength(3);
		expect(picked.every(({ owner }) => owner.group !== "sulawesi")).toBe(true);
	});
	test("SR-218/SRD 2.8: a same-name twin under another code is excluded even under a different id", () => {
		const twin: Area = {
			id: "kota-tangerang",
			type: "kota",
			name: "Tangerang",
			province: "banten",
			aliases: [],
			variants: []
		};
		const withTwin: Bundle = {
			...bundle,
			areas: [...bundle.areas, twin],
			regions: bundle.regions.map((item) =>
				item.id === "b"
					? {
							...item,
							areas: [
								...item.areas,
								{ areaId: "kota-tangerang", confidence: "high" as const }
							]
						}
					: item
			)
		};
		for (let seed = 0; seed < 10; seed++) {
			const picked = foreignAreas(withTwin, region("a"), NATIONAL, 3, seeded(`t${seed}`));
			expect(picked.some(({ area }) => area.name === "Tangerang")).toBe(false);
		}
	});
	test("a medium member of the asked code is still excluded from its own distractors", () => {
		for (let seed = 0; seed < 10; seed++) {
			const picked = foreignAreas(
				bundle,
				region("bk"),
				{ level: "group", id: "sumatera" },
				3,
				seeded(`l${seed}`)
			);
			expect(picked.some(({ area }) => area.name === "Langkat")).toBe(false);
		}
	});
	test("other codes exclude every valid code", () => {
		const codes = otherCodes(
			bundle,
			region("a"),
			NATIONAL,
			new Set(["a", "b"]),
			3,
			seeded("z")
		);
		expect(codes).toHaveLength(3);
		expect(codes.some((item) => item.id === "a" || item.id === "b")).toBe(false);
	});
	test("SR-322: holder2special includes a neighbouring number", () => {
		const japan = bundle.specials.find((entry) => entry.number === "49")!;
		for (let seed = 0; seed < 10; seed++) {
			const choices = specialChoices(bundle, japan, "holder2special", 3, seeded(`n${seed}`));
			expect(choices).toHaveLength(3);
			expect(choices.some((entry) => entry.number === "48" || entry.number === "50")).toBe(
				true
			);
			expect(
				choices.some((entry) => entry.id === japan.id || entry.confidence !== "high")
			).toBe(false);
		}
	});
	test("SR-323: special2holder never offers an alias of the asked holder", () => {
		const usa = bundle.specials.find((entry) => entry.number === "12")!;
		const lookalike = {
			...bundle.specials[1],
			id: "cd-99-amerika",
			number: "99",
			holder: "Amerika"
		};
		const withLookalike = { ...bundle, specials: [...bundle.specials, lookalike] };
		for (let seed = 0; seed < 10; seed++) {
			const choices = specialChoices(
				withLookalike,
				usa,
				"special2holder",
				3,
				seeded(`h${seed}`)
			);
			expect(choices.some((entry) => entry.id === "cd-99-amerika")).toBe(false);
		}
	});
	test("SR-323: holder2special never offers an alias of the asked holder either", () => {
		const usa = bundle.specials.find((entry) => entry.number === "12")!;
		const lookalike = {
			...bundle.specials[1],
			id: "cd-99-amerika",
			number: "99",
			holder: "Amerika"
		};
		const withLookalike = { ...bundle, specials: [...bundle.specials, lookalike] };
		for (let seed = 0; seed < 10; seed++) {
			const choices = specialChoices(
				withLookalike,
				usa,
				"holder2special",
				3,
				seeded(`k${seed}`)
			);
			expect(choices.some((entry) => entry.id === "cd-99-amerika")).toBe(false);
		}
	});
});
