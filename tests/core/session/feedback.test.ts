import { describe, expect, test } from "bun:test";
import { buildDictionary, highMembers } from "../../../src/core/answers/dictionary";
import type { Bundle } from "../../../src/core/content/schema";
import { buildQuestion } from "../../../src/core/questions/build";
import { newEntry } from "../../../src/core/replay/state";
import { checkAnswer } from "../../../src/core/session/check";
import { alsoCorrect, setFeedback } from "../../../src/core/session/feedback";

const plates: Bundle = await Bun.file(
	new URL("../../../src/data/plates.json", import.meta.url)
).json();
const dictionary = buildDictionary(plates);
const question = (cardId: string) =>
	buildQuestion({ ...newEntry(cardId), state: "review", intervalDays: 5 }, plates, {
		context: "daily",
		level: 2
	});

describe("alsoCorrect", () => {
	test("lists up to three other areas of the code after a correct Tebak daerah", () => {
		const asked = question("bk::code2region");
		const checked = checkAnswer(asked, { text: "Medan" }, plates, dictionary);
		const others = highMembers(
			plates,
			plates.regions.find((region) => region.id === "bk")!
		)
			.filter((area) => area.id !== checked.acceptedAreaId)
			.map((area) => area.name);
		expect(alsoCorrect(plates, asked, checked)).toEqual(others.slice(0, 3));
		expect(alsoCorrect(plates, asked, checked)).not.toContain("Medan");
	});

	test("lists nothing after a wrong answer", () => {
		const asked = question("bk::code2region");
		expect(
			alsoCorrect(plates, asked, checkAnswer(asked, { text: "Padang" }, plates, dictionary))
		).toEqual([]);
	});

	test("lists nothing for Tebak kode", () => {
		const asked = question("bk::region2code");
		expect(
			alsoCorrect(plates, asked, checkAnswer(asked, { text: "BK" }, plates, dictionary))
		).toEqual([]);
	});
});

describe("setFeedback", () => {
	const asked = () =>
		buildQuestion({ ...newEntry("a::setrecall"), state: "review", intervalDays: 20 }, plates, {
			context: "setrecall"
		});
	const feedbackFor = (items: string[]) => {
		const question = asked();
		const checked = checkAnswer(question, { items }, plates, dictionary);
		return { checked, feedback: setFeedback(plates, dictionary, question, checked)! };
	};
	const statuses = (items: string[]) =>
		feedbackFor(items).feedback.items.map(({ text, status }) => [text, status]);

	test("marks each answer as it was judged, in the order it was sent", () => {
		expect(statuses(["Serang", "Banten", "Cilegon", "Gotham"])).toEqual([
			["Serang", "counted"],
			["Banten", "wrong"],
			["Cilegon", "counted"],
			["Gotham", "wrong"]
		]);
	});

	test("a list of right answers that is too short has no wrong answer", () => {
		const { checked, feedback } = feedbackFor(["Serang", "Cilegon", "Tangerang"]);
		expect(checked.correct).toBe(false);
		expect(feedback.items.every((item) => item.status === "counted")).toBe(true);
		expect(feedback.counted).toBe(3);
		expect(feedback.needed).toBe(checked.setThreshold!);
	});

	test("lists what was left out and every area of the code", () => {
		const { feedback } = feedbackFor(["Serang", "Cilegon", "Tangerang"]);
		expect(feedback.missing).toEqual(
			expect.arrayContaining(["Kabupaten Pandeglang", "Kabupaten Lebak"])
		);
		expect(feedback.missing).not.toContain("Kota Cilegon");
		expect(feedback.all).toEqual(expect.arrayContaining(feedback.missing));
		expect(feedback.all.length).toBeGreaterThan(feedback.missing.length);
	});

	test("a province name is wrong, and says why", () => {
		const { feedback } = feedbackFor(["Banten", "Serang"]);
		expect(feedback.counted).toBe(1);
		expect(feedback.items[0]).toEqual({
			text: "Banten",
			status: "wrong",
			reason: "nama provinsi atau julukan, bukan kab/kota"
		});
	});

	test("an area of another code is named by that code", () => {
		const { feedback } = feedbackFor(["Medan"]);
		expect(feedback.counted).toBe(0);
		expect(feedback.items).toEqual([
			{ text: "Medan", status: "wrong", reason: "dipakai kode BK" }
		]);
	});

	test("an unknown name is wrong and a repeat is only a repeat", () => {
		const { feedback } = feedbackFor(["Cilegon", "cilegon", "Gotham"]);
		expect(feedback.counted).toBe(1);
		expect(feedback.items).toEqual([
			{ text: "Cilegon", status: "counted", reason: null },
			{ text: "cilegon", status: "repeat", reason: "sudah disebut" },
			{ text: "Gotham", status: "wrong", reason: "bukan daerah yang memakai A" }
		]);
	});

	test("an answer that is not a list has no set feedback", () => {
		const question = buildQuestion(
			{ ...newEntry("bk::code2region"), state: "review" },
			plates,
			{
				context: "daily",
				level: 2
			}
		);
		const checked = checkAnswer(question, { text: "Medan" }, plates, dictionary);
		expect(setFeedback(plates, dictionary, question, checked)).toBeNull();
	});
});
