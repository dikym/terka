import { describe, expect, test } from "bun:test";
import { NATIONAL, type Scope } from "../../../src/core/questions/distractors";
import type { AppState } from "../../../src/core/replay/state";
import { nextScope } from "../../../src/lib/view/next-scope";
import { fresh, reviewCard, ruleBundle, seedCard } from "../../core/replay/fixtures";

const bundle = ruleBundle();

// Introduces every code in the given groups or provinces.
function introduced(state: AppState, keep: (region: (typeof bundle.regions)[number]) => boolean) {
	for (const region of bundle.regions.filter(keep))
		seedCard(state, `${region.id}::code2region`, reviewCard());
	return state;
}

const province = (id: string): Scope => ({ level: "province", id });
const group = (id: string): Scope => ({ level: "group", id });

describe("next scope", () => {
	test("a finished province moves to the next province in its group", () => {
		const state = introduced(fresh(), (region) => region.province === "sumatera-utara");
		expect(nextScope(state, bundle, province("sumatera-utara"))).toEqual(
			province("sumatera-barat")
		);
	});
	test("a province already done further on is skipped", () => {
		const state = introduced(fresh(), (region) =>
			["sumatera-utara", "sumatera-barat"].includes(region.province)
		);
		expect(nextScope(state, bundle, province("sumatera-utara"))).toEqual(province("riau"));
	});
	test("the last province of a group moves to the first open province of the next group", () => {
		const state = introduced(fresh(), (region) => region.group === "sumatera");
		expect(nextScope(state, bundle, province("bengkulu"))).toEqual(province("banten"));
	});
	test("a finished group moves to the next open group", () => {
		const state = introduced(fresh(), (region) => ["sumatera", "jawa"].includes(region.group));
		expect(nextScope(state, bundle, group("sumatera"))).toEqual(group("bali-nusa-tenggara"));
	});
	test("the search wraps around to groups before the current one", () => {
		const state = introduced(fresh(), (region) => region.group !== "sumatera");
		expect(nextScope(state, bundle, group("sulawesi"))).toEqual(group("sumatera"));
	});
	test("a scope with new material left gets no offer", () => {
		expect(nextScope(fresh(), bundle, province("sumatera-utara"))).toBeNull();
	});
	test("nothing new anywhere gets no offer", () => {
		const state = introduced(fresh(), () => true);
		expect(nextScope(state, bundle, group("sumatera"))).toBeNull();
	});
	test("national gets no offer", () => {
		const state = introduced(fresh(), () => true);
		expect(nextScope(state, bundle, NATIONAL)).toBeNull();
	});
});
