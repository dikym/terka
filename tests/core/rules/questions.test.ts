import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { areaDisplayName } from "../../../src/core/answers/dictionary";
import { bundleSchema } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { eligibleRegions } from "../../../src/core/questions/distractors";
import { newCard, type CardMemory } from "../../../src/core/scheduling/card-memory";
import { ruleBundle } from "./fixtures";

const bundle = ruleBundle();
const nameOf = (id: string) => areaDisplayName(bundle.areas.find((area) => area.id === id)!);
const review = (cardId: string, extra: Partial<CardMemory> = {}): CardMemory => ({
	...newCard(cardId),
	state: "review",
	stability: 5,
	difficulty: 5,
	intervalDays: 5,
	reps: 3,
	...extra
});
const members = (id: string) =>
	bundle.regions
		.find((region) => region.id === id)!
		.areas.filter((m) => m.confidence === "high")
		.map((m) => nameOf(m.areaId));

describe("region questions", () => {
	test("SR-217/AC-26: Tebak daerah Level 1 offers one member and three scope areas, never province names", () => {
		const question = buildQuestion(review("bk::code2region"), bundle, {
			context: "daily",
			level: 1,
			scope: { level: "group", id: "sumatera" }
		});
		expect(question).toMatchObject({
			questionType: "choice",
			answerForm: "choice",
			label: "Tebak daerah",
			prompt: "BK dipakai daerah mana?"
		});
		expect(question.choices).toHaveLength(4);
		expect(question.choices.filter((choice) => members("bk").includes(choice))).toHaveLength(1);
		expect(question.choices.some((choice) => choice === "Sumatera Utara")).toBe(false);
	});
	test("SR-221/SR-222 + Review Focus: Tebak kode rotates the shown area and allows a single area to repeat", () => {
		const first = buildQuestion(review("dk::region2code"), bundle, { context: "daily" });
		expect(first).toMatchObject({
			questionType: "typed",
			answerForm: "code",
			label: "Tebak kode"
		});
		expect(first.prompt).toMatch(/^Kode pelat (Kota|Kabupaten) /);
		const next = buildQuestion(review("dk::region2code"), bundle, {
			context: "daily",
			previousPromptAreaId: first.promptAreaId
		});
		expect(next.promptAreaId).not.toBe(first.promptAreaId);
		const single = buildQuestion(review("bm::region2code"), bundle, {
			context: "daily",
			previousPromptAreaId: "kota-pekanbaru"
		});
		expect(single.promptAreaId).toBe("kota-pekanbaru");
	});
	test("SR-097: Tebak kode for a shared area accepts both codes", () => {
		let hit = false;
		for (let reps = 0; reps < 10; reps++) {
			const question = buildQuestion(review("a::region2code", { reps }), bundle, {
				context: "daily"
			});
			if (question.promptAreaId === "kab-tangerang") {
				hit = true;
				expect(question.answer).toEqual({
					kind: "region-code",
					areaId: "kab-tangerang",
					codeIds: ["a", "b"]
				});
			}
		}
		expect(hit).toBe(true);
	});
	test("drill answer codeIds cover every high code of the shown area, not just the asked one", () => {
		let hit = false;
		for (let reps = 0; reps < 10; reps++) {
			const drill = buildQuestion(review("a::code2region", { reps }), bundle, {
				context: "drill",
				drillPair: "p"
			});
			if (drill.promptAreaId === "kab-tangerang") {
				hit = true;
				expect(drill.answer).toEqual({
					kind: "region-code",
					areaId: "kab-tangerang",
					codeIds: ["a", "b"]
				});
			}
		}
		expect(hit).toBe(true);
	});
	test("SR-338/SR-339/SR-340: typed levels show no partial hint; Level 3 is Tebak berwaktu", () => {
		const two = buildQuestion(review("bk::code2region"), bundle, { context: "daily" });
		expect(two).toMatchObject({ level: 2, choices: [], reveal: null, limit: null });
		const three = buildQuestion(review("bk::code2region", { intervalDays: 25 }), bundle, {
			context: "daily"
		});
		expect(three).toMatchObject({
			level: 3,
			levelSource: "auto",
			questionType: "typed",
			label: "Tebak berwaktu",
			limit: { ms: 8000, until: "first-input" }
		});
	});
	test("true/false and odd-one-out", () => {
		const tf = buildQuestion(review("bk::code2region"), bundle, {
			context: "kilat",
			format: "truefalse"
		});
		expect(tf).toMatchObject({
			questionType: "truefalse",
			label: "Benar atau salah",
			choices: ["Benar", "Salah"],
			limit: { ms: 2000, until: "answer" }
		});
		expect(tf.prompt).toMatch(/^BK dipakai (Kota|Kabupaten) .+\.$/);
		const odd = buildQuestion(review("bk::code2region"), bundle, {
			context: "daily",
			level: 1,
			format: "oddoneout"
		});
		expect(odd).toMatchObject({
			questionType: "oddoneout",
			label: "Mana yang bukan",
			prompt: "Mana yang tidak memakai BK?"
		});
		expect(odd.choices).toHaveLength(4);
		expect(odd.answer.kind === "literal" && !members("bk").includes(odd.answer.value)).toBe(
			true
		);
	});
	test("SR-071/SR-299: Perkenalan is Level 1 'tebak dulu'; without enough distractors it is intro_read", () => {
		const intro = buildQuestion(newCard("bk::code2region"), bundle, { context: "intro" });
		expect(intro).toMatchObject({
			level: 1,
			label: "Materi baru · tebak dulu",
			questionType: "choice"
		});
		const tiny = {
			...bundle,
			regions: [bundle.regions[0]],
			areas: bundle.areas.filter((area) => area.province === "sumatera-utara")
		};
		const read = buildQuestion(newCard("bk::code2region"), tiny, { context: "intro" });
		expect(read).toMatchObject({
			questionType: "intro_read",
			choices: [],
			label: "Materi baru · tebak dulu"
		});
		expect(read.reveal?.lines).toEqual(members("bk"));
		const typed = buildQuestion(review("bk::code2region"), tiny, {
			context: "daily",
			level: 1
		});
		// SRD 3.3/3.4: the insufficient-distractor fallback recomputes levelSource against
		// autoLevel (here 2) rather than keeping the original manual_down request (level 1).
		expect(typed).toMatchObject({ questionType: "typed", level: 2, levelSource: "auto" });
	});
	test("SRD 754: setrecall is Level 1 only in intro; every other context is fixed at Level 3", () => {
		const intro = buildQuestion(newCard("bk::setrecall"), bundle, { context: "intro" });
		expect(intro).toMatchObject({
			level: 1,
			label: "Materi baru · tebak dulu",
			questionType: "setrecall"
		});
		expect(() =>
			buildQuestion(review("bk::setrecall"), bundle, { context: "setrecall", level: 1 })
		).toThrow("fixed");
	});
	test("set recall, placement and Bandingkan Kode", () => {
		const set = buildQuestion(review("bk::setrecall"), bundle, { context: "setrecall" });
		expect(set).toMatchObject({
			questionType: "setrecall",
			level: 3,
			prompt: "Sebutkan daerah yang memakai BK.",
			setThreshold: 4,
			answer: { kind: "set", codeId: "bk" }
		});
		const placement = buildQuestion(newCard("bk::code2region"), bundle, {
			context: "placement"
		});
		expect(placement).toMatchObject({
			questionType: "typed",
			level: 2,
			limit: { ms: 15000, until: "first-input" }
		});
		const drill = buildQuestion(review("bk::code2region"), bundle, {
			context: "drill",
			drillPair: "bb"
		});
		expect(drill).toMatchObject({
			level: 3,
			label: "Bandingkan Kode",
			drillPairWith: "bb",
			answerForm: "code"
		});
		expect([...drill.choices].sort()).toEqual(["BB", "BK"]);
		expect(drill.prompt).toMatch(/^BK atau BB: (Kota|Kabupaten) .+\?$/);
	});
	test("SR-120/SR-310: a leech shows its areas and note first and is marked assisted", () => {
		const question = buildQuestion(review("bk::code2region", { lapses: 6 }), bundle, {
			context: "daily",
			note: "BK: Bukit Kelapa"
		});
		expect(question.reveal).toEqual({ lines: members("bk"), note: "BK: Bukit Kelapa" });
		expect(question.assisted).toBe(true);
	});
	test("Review Focus: the same card and reps always build the same question", () => {
		const options = { context: "daily" as const, level: 1 as const };
		expect(buildQuestion(review("bk::code2region"), bundle, options)).toEqual(
			buildQuestion(review("bk::code2region"), bundle, options)
		);
	});
});

describe("special plate questions (SRD 2.9)", () => {
	test("SR-322/SR-323/SR-324: Tebak diplomat in both directions", () => {
		const toHolder = buildQuestion(review("cd-49-jepang::special2holder"), bundle, {
			context: "special",
			level: 1
		});
		expect(toHolder).toMatchObject({
			label: "Tebak diplomat",
			prompt: "CD 49 dipakai perwakilan mana?",
			answer: { kind: "holder", specialId: "cd-49-jepang" }
		});
		expect(toHolder.choices).toContain("Jepang");
		expect(toHolder.choices).toHaveLength(4);
		const toCode = buildQuestion(review("cd-49-jepang::holder2special"), bundle, {
			context: "special",
			level: 1
		});
		expect(toCode).toMatchObject({
			prompt: "Berapa kode CD untuk Jepang?",
			answerForm: "choice"
		});
		expect(toCode.choices).toContain("CD 49");
		expect(toCode.choices.some((choice) => choice === "CD 48" || choice === "CD 50")).toBe(
			true
		);
		expect(
			[...toHolder.choices, ...toCode.choices].some((choice) => /\d+ \d+/.test(choice))
		).toBe(false);
		const typed = buildQuestion(
			review("cd-49-jepang::holder2special", { intervalDays: 25 }),
			bundle,
			{ context: "special" }
		);
		expect(typed).toMatchObject({
			level: 3,
			questionType: "typed",
			answerForm: "code",
			limit: { ms: 8000, until: "first-input" }
		});
	});
	test("SRD 2.8: without three distractors Perkenalan is intro_read; otherwise typed Level 2", () => {
		const few = {
			...bundle,
			specials: bundle.specials.filter((entry) => ["48", "49"].includes(entry.number))
		};
		const read = buildQuestion(newCard("cd-49-jepang::special2holder"), few, {
			context: "intro"
		});
		expect(read).toMatchObject({ questionType: "intro_read", choices: [], limit: null });
		expect(read.reveal?.lines).toEqual(["Jepang"]);
		const toCode = buildQuestion(newCard("cd-49-jepang::holder2special"), few, {
			context: "intro"
		});
		expect(toCode.reveal?.lines).toEqual(["CD 49"]);
		const typed = buildQuestion(review("cd-49-jepang::special2holder"), few, {
			context: "special",
			level: 1
		});
		expect(typed).toMatchObject({
			questionType: "typed",
			answerForm: "name",
			level: 2,
			levelSource: "auto",
			choices: []
		});
	});
});

describe("real content", () => {
	test("every real code builds every Level 1 form", async () => {
		const real = bundleSchema.parse(JSON.parse(await readFile("src/data/plates.json", "utf8")));
		for (const region of eligibleRegions(real)) {
			for (const format of ["choice", "truefalse", "oddoneout"] as const) {
				const question = buildQuestion(review(`${region.id}::code2region`), real, {
					context: "daily",
					level: 1,
					format
				});
				expect(new Set(question.choices).size).toBeGreaterThanOrEqual(2);
			}
			const code = buildQuestion(review(`${region.id}::region2code`), real, {
				context: "daily",
				level: 1
			});
			expect(code.choices).toHaveLength(4);
		}
	});
});
