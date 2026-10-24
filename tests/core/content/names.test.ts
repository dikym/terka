import { describe, expect, test } from "bun:test";
import { assembleBundle } from "../../../src/core/content/build";
import { groupName, provinceName } from "../../../src/core/content/names";
import { validDraft } from "./fixtures";

describe("scope names", () => {
	test("the bundle carries the group names in curation order", () => {
		const draft = validDraft();
		expect(assembleBundle(draft).groups).toEqual(draft.curation.groups);
	});

	test("names a group and a province for display", () => {
		const bundle = assembleBundle(validDraft());
		const group = bundle.groups[0];
		expect(groupName(bundle, group.id)).toBe(group.name);
		expect(provinceName("nusa-tenggara-barat")).toBe("Nusa Tenggara Barat");
	});

	test("the shipped content names Bali & Nusa Tenggara", async () => {
		const plates = await Bun.file(
			new URL("../../../src/data/plates.json", import.meta.url)
		).json();
		expect(groupName(plates, "bali-nusa-tenggara")).toBe("Bali & Nusa Tenggara");
	});
});
