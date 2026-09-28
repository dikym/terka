import { describe, expect, test } from "bun:test";
import { assembleBundle, buildFromDraft } from "../../../src/core/content/build";
import { errorCodes, validDraft } from "./fixtures";

const options = { today: "2026-09-28", release: false, previous: null as unknown };

describe("bundle build", () => {
	test("TR-01: a valid draft builds a TRD bundle with contentRev and no editorial fields", () => {
		const { bundle, messages } = buildFromDraft(validDraft(), options);
		expect(errorCodes(messages)).toEqual([]);
		expect(bundle!.contentRev).toBe(1);
		expect(Object.keys(bundle!)).toEqual([
			"version",
			"contentRev",
			"contentHistory",
			"regions",
			"areas",
			"facts",
			"specialsVersion",
			"sources",
			"specials",
			"referencePlates"
		]);
		expect("sources" in bundle!.regions[0]).toBe(false);
		expect(bundle!.regions[0].facts).toEqual(["f-001"]);
		expect(bundle!.facts[0]).toEqual({
			id: "f-001",
			historyLabel: "legenda",
			text: "Cerita batalion.",
			publicationStatus: "draft",
			source: null,
			sourceCheckedAt: null
		});
	});
	test("the same draft builds identical JSON", () => {
		expect(JSON.stringify(buildFromDraft(validDraft(), options))).toBe(
			JSON.stringify(buildFromDraft(validDraft(), options))
		);
	});
	test("release mode turns warnings into errors", () => {
		const draft = validDraft();
		draft.specials.specials[0].reviewBy = "2026-01-01";
		expect(buildFromDraft(draft, options).bundle).not.toBeNull();
		const release = buildFromDraft(draft, { ...options, release: true });
		expect(release.bundle).toBeNull();
		expect(errorCodes(release.messages)).toContain("review-due");
	});
	test("TR-195: content changed without a contentRev bump fails; history stays append-only", () => {
		const released = assembleBundle(validDraft());
		const changed = validDraft();
		changed.curation.areas[0].name = "Daerah baru";
		expect(
			errorCodes(buildFromDraft(changed, { ...options, previous: released }).messages)
		).toContain("content-rev-not-bumped");
		changed.curation.version = "2026.10.01";
		changed.curation.contentRev = 2;
		changed.curation.contentHistory.push({ contentRev: 2, version: "2026.10.01" });
		expect(
			errorCodes(buildFromDraft(changed, { ...options, previous: released }).messages)
		).toEqual([]);
		const rewritten = validDraft();
		rewritten.curation.contentRev = 2;
		rewritten.curation.contentHistory = [
			{ contentRev: 1, version: "2026.09.01" },
			{ contentRev: 2, version: "2026.09.28" }
		];
		expect(
			errorCodes(buildFromDraft(rewritten, { ...options, previous: released }).messages)
		).toContain("content-history-changed");
	});
	test("an unchanged rebuild against the previous bundle passes", () => {
		const released = assembleBundle(validDraft());
		expect(
			errorCodes(buildFromDraft(validDraft(), { ...options, previous: released }).messages)
		).toEqual([]);
	});
	test("exclusive provinces are reported", () => {
		const { messages } = buildFromDraft(validDraft(), options);
		expect(messages.some((message) => message.code === "exclusive-province")).toBe(true);
	});
});
