import { describe, expect, test } from "bun:test";
import { bundleSchema } from "../../../src/core/content/schema";

const bundle = () => ({
	version: "2026.09.28",
	contentRev: 1,
	contentHistory: [{ contentRev: 1, version: "2026.09.28" }],
	regions: [
		{
			id: "dk",
			code: "DK",
			region: "Bali",
			group: "bali-nusa-tenggara",
			province: "bali",
			spans: [],
			placementTier: "common",
			confidence: "high",
			aliases: [] as string[],
			areas: [{ areaId: "kota-denpasar", confidence: "high" }],
			facts: []
		}
	],
	areas: [
		{
			id: "kota-denpasar",
			type: "kota",
			name: "Denpasar",
			province: "bali",
			aliases: [],
			variants: []
		}
	],
	facts: [],
	sources: [],
	specials: [],
	referencePlates: []
});

describe("bundle schema", () => {
	test("an empty aliases array is valid", () => {
		expect(bundleSchema.safeParse(bundle()).success).toBe(true);
	});
	test("a region without aliases is rejected", () => {
		const value = bundle() as Record<string, unknown> & { regions: Record<string, unknown>[] };
		delete value.regions[0].aliases;
		expect(bundleSchema.safeParse(value).success).toBe(false);
	});
	test("sourceRevision is not part of the bundle", () => {
		expect(bundleSchema.safeParse({ ...bundle(), sourceRevision: "x" }).success).toBe(false);
	});
	test("specialsVersion is not part of the bundle", () => {
		expect(bundleSchema.safeParse({ ...bundle(), specialsVersion: "2026.09.24" }).success).toBe(
			false
		);
	});
	test("a legenda history label is rejected", () => {
		const value = bundle();
		(value.facts as unknown[]).push({
			id: "fact-a",
			historyLabel: "legenda",
			text: "A.",
			publicationStatus: "draft",
			source: [],
			sourceCheckedAt: null
		});
		expect(bundleSchema.safeParse(value).success).toBe(false);
	});
});
