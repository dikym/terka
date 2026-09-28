import { describe, expect, test } from "bun:test";
import { readCuration } from "../../../src/core/content/read-curation";
import { validDraft } from "./fixtures";

describe("curation reader", () => {
	test("a valid curation parses", () => {
		expect(readCuration(validDraft().curation).regions).toHaveLength(28);
	});
	test("TR-02: a region without aliases fails and names the region id", () => {
		const curation = structuredClone(validDraft().curation) as unknown as {
			regions: Record<string, unknown>[];
		};
		delete curation.regions[3].aliases;
		expect(() => readCuration(curation)).toThrow("(id ad)");
	});
	test("unknown top-level keys such as factLinks are rejected", () => {
		expect(() => readCuration({ ...validDraft().curation, factLinks: [] })).toThrow(
			"plate-curation.json"
		);
	});
});
