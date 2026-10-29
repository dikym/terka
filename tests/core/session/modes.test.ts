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
	describe("with a nonce", () => {
		const CODES = ["bk", "bb", "ba", "bm", "bp"];
		const learned = () => {
			const state = fresh();
			for (const code of CODES)
				seedCard(state, `${code}::code2region`, reviewCard({ due: NOW + 5 * DAY }));
			return state;
		};
		const order = (nonce?: string, state = learned()) =>
			focusedQueue(state, bundle, SUMATERA, at, nonce).map((item) => item.cardId);

		test("the same nonce gives the same order and another nonce a different one", () => {
			expect(order("a")).toEqual(order("a"));
			const orders = Array.from({ length: 8 }, (_, index) => order(`run-${index}`).join());
			expect(new Set(orders).size).toBeGreaterThan(1);
			expect(order("a").toSorted()).toEqual(order().toSorted());
		});
		test("cards due now stay ahead of the rest", () => {
			const state = learned();
			seedCard(state, "bm::code2region", reviewCard({ due: NOW - DAY }));
			for (let index = 0; index < 8; index++)
				expect(order(`run-${index}`, state)[0]).toBe("bm::code2region");
		});
		test("the format of a question changes with the nonce", () => {
			const formats = Array.from({ length: 12 }, (_, index) =>
				focusedQueue(learned(), bundle, SUMATERA, at, `run-${index}`)
					.map((item) => item.format)
					.join()
			);
			expect(new Set(formats).size).toBeGreaterThan(1);
		});
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
	describe("with several learned cards", () => {
		const CODES = ["bk", "bb", "ba", "bm", "bp"];
		const learned = () => {
			const state = fresh();
			for (const code of CODES) seedCard(state, `${code}::code2region`, reviewCard());
			return state;
		};
		const run = (runId: string, length = 60) => {
			const state = learned();
			return Array.from({ length }, (_, index) =>
				kilatQuestion(state, bundle, SUMATERA, runId, index)!
			);
		};

		test("never asks the same card twice in a row, across passes too", () => {
			for (let seed = 0; seed < 40; seed++) {
				const ids = run(`run-${seed}`).map((item) => item.cardId);
				ids.slice(1).forEach((id, index) => expect(id).not.toBe(ids[index]));
			}
		});
		test("each pass covers every learned card once", () => {
			const ids = run("run-k", 20).map((item) => item.cardId);
			for (let pass = 0; pass < 4; pass++)
				expect(new Set(ids.slice(pass * 5, pass * 5 + 5)).size).toBe(5);
		});
		test("another run deals another order, the same run the same one", () => {
			expect(run("run-a")).toEqual(run("run-a"));
			const first = run("run-a", 5)
				.map((item) => item.cardId)
				.join();
			const others = Array.from({ length: 8 }, (_, index) =>
				run(`run-${index}`, 5)
					.map((item) => item.cardId)
					.join()
			);
			expect(others.some((order) => order !== first)).toBe(true);
		});
		test("two learned cards alternate", () => {
			const state = fresh();
			for (const code of ["bk", "bb"]) seedCard(state, `${code}::code2region`, reviewCard());
			const ids = Array.from(
				{ length: 30 },
				(_, index) => kilatQuestion(state, bundle, SUMATERA, "run-k", index)!.cardId
			);
			ids.slice(1).forEach((id, index) => expect(id).not.toBe(ids[index]));
		});
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
