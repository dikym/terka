import { describe, expect, test } from "bun:test";
import {
	challengeQueue,
	focusedQueue,
	kilatQuestion,
	setrecallDue,
	setrecallQueue
} from "../../../src/core/session/modes";
import { DAY, fresh, NOW, reviewCard, ruleBundle, seedCard } from "../replay/fixtures";
import { ctxAt, SUMATERA } from "./fixtures";

const TODAY = "2026-09-21";
const at = ctxAt(NOW + 3_600_000);
const bundle = ruleBundle();

describe("Latihan Terfokus", () => {
	test("learned cards of the chosen area only, whether due or not", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard({ due: NOW + 5 * DAY }));
		seedCard(state, "dk::code2region", reviewCard());
		const items = focusedQueue(state, bundle, SUMATERA, at);
		expect(items.map((item) => item.cardId)).toEqual(["bk::code2region"]);
		expect(items[0].context).toBe("focused");
	});
	test("an area without learned cards cannot start", () => {
		expect(focusedQueue(fresh(), bundle, SUMATERA, at)).toEqual([]);
	});
});

describe("Tantangan Harian", () => {
	test("at most five learned cards, the same five for the same day", () => {
		const state = fresh();
		for (const code of ["bk", "bb", "ba", "bm", "bp", "dk", "dr"])
			seedCard(state, `${code}::code2region`, reviewCard({ due: NOW + 5 * DAY }));
		const first = challengeQueue(state, at);
		expect(Array.isArray(first) && first.length).toBe(5);
		expect(challengeQueue(state, ctxAt(NOW + 5 * 3_600_000))).toEqual(first);
	});
	test("three learned cards give three questions", () => {
		const state = fresh();
		for (const code of ["bk", "bb", "ba"])
			seedCard(state, `${code}::code2region`, reviewCard());
		expect(challengeQueue(state, at)).toHaveLength(3);
	});
	test("nothing learned yet, or already done today, is unavailable", () => {
		expect(challengeQueue(fresh(), at)).toEqual({ unavailable: "empty" });
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		state.challengeDays.add(TODAY);
		expect(challengeQueue(state, at)).toEqual({ unavailable: "done" });
	});
	test("special and setrecall cards are never picked", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", reviewCard());
		seedCard(state, "cd-49-jepang::special2holder", reviewCard());
		expect(challengeQueue(state, at)).toEqual({ unavailable: "empty" });
	});
});

describe("Mode Kilat", () => {
	test("each question is a learned card of the scope, Level 1 forms only", () => {
		const state = fresh();
		seedCard(state, "bk::code2region", reviewCard());
		seedCard(state, "dk::code2region", reviewCard());
		for (let index = 0; index < 20; index++) {
			const question = kilatQuestion(state, bundle, SUMATERA, "run-k", index);
			expect(question).toMatchObject({ cardId: "bk::code2region", context: "kilat" });
			expect(["choice", "truefalse", "oddoneout"]).toContain(question?.format ?? "");
		}
		expect(kilatQuestion(state, bundle, SUMATERA, "run-k", 3)).toEqual(
			kilatQuestion(state, bundle, SUMATERA, "run-k", 3)
		);
	});
	test("no learned card in the scope gives no question", () => {
		expect(kilatQuestion(fresh(), bundle, SUMATERA, "run-k", 0)).toBeNull();
	});
});

describe("Sebutkan sebanyak mungkin", () => {
	test("a locked card or a code without a set card is unavailable", () => {
		expect(setrecallQueue(fresh(), "dk", at)).toEqual({ unavailable: "locked" });
		expect(setrecallQueue(fresh(), "bb", at)).toEqual({ unavailable: "locked" });
	});
	test("a new set card is introduced when quota allows and its group had no introduction today", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", { state: "new" });
		expect(setrecallQueue(state, "dk", at)).toEqual([
			{ cardId: "dk::setrecall", context: "intro", slot: "new", format: "choice" }
		]);
		state.introDay.set("dk", TODAY);
		expect(setrecallQueue(state, "dk", at)).toEqual({ unavailable: "related" });
		state.introDay.clear();
		state.quota.set(`region|${TODAY}`, 10);
		expect(setrecallQueue(state, "dk", at)).toEqual({ unavailable: "quota" });
	});
	test("a learned set card is a Level 3 set question even when not due", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", reviewCard({ due: NOW + 5 * DAY }));
		expect(setrecallQueue(state, "dk", at)).toEqual([
			{ cardId: "dk::setrecall", context: "setrecall", slot: "review" }
		]);
	});
	test("due set cards are listed for the statistics page", () => {
		const state = fresh();
		seedCard(state, "dk::setrecall", reviewCard());
		seedCard(state, "ea::setrecall", reviewCard({ due: NOW + 5 * DAY }));
		expect(setrecallDue(state, at)).toEqual(["dk"]);
	});
});
