import { describe, expect, test } from "bun:test";
import { buildDictionary } from "../../../src/core/answers/dictionary";
import { buildQuestion } from "../../../src/core/questions/build";
import type { QuestionContext, QuestionFormat } from "../../../src/core/questions/question";
import { type CardEntry, newEntry } from "../../../src/core/replay/state";
import { toCard } from "../../../src/lib/session/cards";
import { ruleBundle } from "../../core/replay/fixtures";

const bundle = ruleBundle();
const deps = { bundle, dictionary: buildDictionary(bundle), notes: new Map<string, string>() };
const reviewing = (cardId: string, overrides: Partial<CardEntry> = {}): CardEntry => ({
	...newEntry(cardId),
	state: "review",
	intervalDays: 5,
	reps: 3,
	...overrides
});
const card = (
	entry: CardEntry,
	context: QuestionContext = "daily",
	extra: { format?: QuestionFormat; level?: 1 | 2 | 3; drillPair?: string } = {}
) => {
	const question = buildQuestion(entry, bundle, { context, ...extra });
	return toCard(
		question,
		{ cardId: entry.cardId, context, slot: "review", format: extra.format },
		entry,
		{ ...deps, counts: false, mode: "hariIni" }
	);
};

describe("session cards", () => {
	test("a typed Tebak daerah shows the plate and names the region as its answer", () => {
		const result = card(reviewing("bk::code2region"));
		expect(result.form).toBe("tebakDaerah");
		expect(result.plate?.[0]).toBe("BK");
		expect(result.answer).toBe("Wilayah BK");
		expect(result.options).toBeUndefined();
		expect(result.pill).toEqual({ label: "Tebak daerah", tone: "caution" });
	});

	test("a level 3 question gives eight seconds to start typing", () => {
		const result = card(reviewing("bk::code2region"), "daily", { level: 3 });
		expect(result.form).toBe("tebakBerwaktu");
		expect(result.timer).toEqual({ seconds: 8, kind: "start" });
	});

	test("true or false gives five seconds to answer and marks its right choice", () => {
		const result = card(newEntry("bk::code2region") as CardEntry, "daily", {
			format: "truefalse",
			level: 1
		});
		expect(result.form).toBe("benarSalah");
		expect(result.timer).toEqual({ seconds: 5, kind: "answer" });
		expect(["Benar", "Salah"]).toContain(result.answer);
	});

	test("a drill names both codes in its lead", () => {
		const result = card(reviewing("bk::code2region"), "drill", { drillPair: "bb" });
		expect(result.form).toBe("bandingkan");
		expect(result.compare?.lead).toBe("BK dan BB sering tertukar. Bedakan keduanya.");
		expect(result.compare?.hint).toContain("BK: ");
		expect(result.options).toHaveLength(2);
	});

	test("a Tebak kode answer is the front code, without a plate", () => {
		const result = card(reviewing("bk::region2code"));
		expect(result.form).toBe("tebakKode");
		expect(result.plate).toBeUndefined();
	});

	test("a level 2 typed card can drop to level 1 choices", () => {
		const result = card(reviewing("bk::code2region"));
		expect(result.lowerable).toBe(true);
		expect(result.lowered?.choices.length).toBe(4);
		expect(result.lowered?.choices).toContain(result.loweredAnswer!);
	});

	test("an introduction keeps its four choices and lists the code's areas", () => {
		const result = card(newEntry("bk::code2region") as CardEntry, "intro");
		expect(result.form).toBe("perkenalan");
		expect(result.options).toHaveLength(4);
		expect(result.options).toContain(result.answer);
		expect(result.intro?.areas).toContain("Kota Medan");
		expect(result.lowerable).toBe(false);
	});

	test("a diplomat card shows the CD plate and the holder's flag", () => {
		const result = card(reviewing("cd-49-jepang::special2holder"), "special");
		expect(result.form).toBe("tebakDiplomat");
		expect(result.plate).toEqual(["CD", "49"]);
		expect(result.flag).toBe("jp");
	});
});
