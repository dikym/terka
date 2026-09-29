import { describe, expect, test } from "bun:test";
import { assembleBundle } from "../../../src/core/content/build";
import { revisionRules } from "../../../src/core/content/rules/revision";
import { errorCodes, validDraft } from "./fixtures";

describe("revision rules", () => {
	test("an id missing from the new bundle and not in retiredIds fails", () => {
		const previous = assembleBundle(validDraft());
		const bundle = assembleBundle(validDraft());
		bundle.specials = bundle.specials.filter((special) => special.id !== "cd-13-india");
		expect(errorCodes(revisionRules(bundle, previous, []))).toContain("retired-id-missing");
	});
	test("listing the missing id in retiredIds passes", () => {
		const previous = assembleBundle(validDraft());
		const bundle = assembleBundle(validDraft());
		bundle.specials = bundle.specials.filter((special) => special.id !== "cd-13-india");
		expect(errorCodes(revisionRules(bundle, previous, ["cd-13-india"]))).not.toContain(
			"retired-id-missing"
		);
	});
	test("the not-bumped message tells the author they can restore plates.json from git", () => {
		const previous = assembleBundle(validDraft());
		const bundle = assembleBundle(validDraft());
		bundle.areas = [...bundle.areas];
		bundle.areas[0] = { ...bundle.areas[0], name: "Daerah baru" };
		const message = revisionRules(bundle, previous, []).find(
			(entry) => entry.code === "content-rev-not-bumped"
		);
		expect(message?.message).toContain(
			"restore src/data/plates.json from git if this change already bumped it"
		);
	});
});
