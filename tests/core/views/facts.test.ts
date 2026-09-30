import { describe, expect, test } from "bun:test";
import type { Bundle, Fact } from "../../../src/core/content/schema";
import type { AppState } from "../../../src/core/replay/state";
import { factViewEvent, pickFact } from "../../../src/core/views/facts";
import { factView, fresh, NOW, ruleBundle, stateOf } from "../replay/fixtures";
import { ctxAt } from "../session/fixtures";

const fact = (index: number, overrides: Partial<Fact> = {}): Fact => ({
	id: `f-${String(index).padStart(3, "0")}`,
	historyLabel: "terverifikasi",
	text: `Fakta ${index}`,
	publicationStatus: "ready",
	source: "Sumber",
	sourceCheckedAt: "2026-09-01",
	...overrides
});
function withFacts(facts: Fact[]): Bundle {
	const bundle = ruleBundle();
	bundle.facts = facts;
	return bundle;
}
const show = (state: AppState, factId: string) =>
	state.factViews.push({ factId, localDay: "2026-09-21", runId: null });

describe("Fakta menarik", () => {
	test("with 43 ready facts none repeats within 20 screens", () => {
		const bundle = withFacts(Array.from({ length: 43 }, (_, index) => fact(index)));
		const state = fresh(bundle);
		const shown: string[] = [];
		for (let index = 0; index < 25; index++) {
			const picked = pickFact(state, bundle, [], `run-${index}`)!;
			expect(shown.slice(-20)).not.toContain(picked.id);
			shown.push(picked.id);
			show(state, picked.id);
		}
	});
	test("with 10 ready and 33 draft facts N is 5 and drafts never show", () => {
		const bundle = withFacts([
			...Array.from({ length: 10 }, (_, index) => fact(index)),
			...Array.from({ length: 33 }, (_, index) =>
				fact(100 + index, { publicationStatus: "draft" })
			)
		]);
		const state = fresh(bundle);
		for (let index = 0; index < 5; index++) show(state, fact(index).id);
		for (let index = 0; index < 20; index++) {
			const picked = pickFact(state, bundle, [], `run-${index}`)!;
			expect(Number(picked.id.slice(2))).toBeGreaterThanOrEqual(5);
			expect(Number(picked.id.slice(2))).toBeLessThan(10);
		}
	});
	test("facts of answered codes come first, others when none is left", () => {
		const bundle = withFacts(Array.from({ length: 6 }, (_, index) => fact(index)));
		bundle.regions.find((region) => region.id === "dk")!.facts = ["f-002"];
		const state = fresh(bundle);
		expect(pickFact(state, bundle, ["dk"], "run-a")?.id).toBe("f-002");
		show(state, "f-002");
		expect(pickFact(state, bundle, ["dk"], "run-b")?.id).not.toBe("f-002");
	});
	test("no legend right after a legend in the last two screens", () => {
		const bundle = withFacts([
			fact(0, { historyLabel: "legenda" }),
			fact(1, { historyLabel: "legenda" }),
			fact(2),
			fact(3),
			fact(4),
			fact(5)
		]);
		const state = fresh(bundle);
		show(state, "f-000");
		for (let index = 0; index < 10; index++)
			expect(pickFact(state, bundle, [], `run-${index}`)?.historyLabel).not.toBe("legenda");
	});
	test("when the filters leave nothing, the fact unseen the longest is picked", () => {
		const bundle = withFacts([
			fact(0, { historyLabel: "legenda" }),
			fact(1, { historyLabel: "legenda" })
		]);
		const state = fresh(bundle);
		show(state, "f-000");
		show(state, "f-001");
		expect(pickFact(state, bundle, [], "run-x")?.id).toBe("f-000");
	});
	test("same session, content and history give the same fact", () => {
		const bundle = withFacts(Array.from({ length: 12 }, (_, index) => fact(index)));
		expect(pickFact(fresh(bundle), bundle, [], "run-z")).toEqual(
			pickFact(fresh(bundle), bundle, [], "run-z")
		);
	});
	test("a fact shown on another device is skipped after sync", () => {
		const bundle = withFacts([fact(0), fact(1), fact(2), fact(3)]);
		const state = stateOf([factView("f-001", NOW), factView("f-002", NOW + 1)], bundle);
		for (let index = 0; index < 10; index++)
			expect(["f-001", "f-002"]).not.toContain(
				pickFact(state, bundle, [], `run-${index}`)?.id
			);
	});
	test("a fact turned back to draft leaves the rotation window", () => {
		const bundle = withFacts([
			fact(0),
			fact(1),
			fact(2),
			fact(3, { publicationStatus: "draft" })
		]);
		const state = fresh(bundle);
		show(state, "f-000");
		show(state, "f-003");
		expect(pickFact(state, bundle, [], "run-q")?.id).not.toBe("f-000");
	});
	test("no ready fact hides the block", () => {
		expect(pickFact(fresh(), ruleBundle(), [], "run")).toBeNull();
	});
	test("the view event names the fact and the session", () => {
		expect(factViewEvent("f-001", "run-1", ctxAt(NOW)).row).toMatchObject({
			factId: "f-001",
			runId: "run-1",
			localDay: "2026-09-21"
		});
	});
});
