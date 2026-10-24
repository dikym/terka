import { describe, expect, test } from "bun:test";
import { findViolations, repoFiles } from "../../scripts/ci/test-names";

const file = (text: string, path = "tests/x.test.ts") => [{ path, text }];

describe("findViolations", () => {
	test("flags a catalogue id in a test name", () => {
		expect(findViolations(file('test("SR-12 keeps the quota", () => {});'))).toHaveLength(1);
		expect(findViolations(file("describe(`E2E-51 offline`, () => {});"))).toHaveLength(1);
	});

	test("flags a document reference in a comment", () => {
		expect(findViolations(file("const a = 1; // see SRD 4.7"))).toHaveLength(1);
		expect(findViolations(file("/* follows TRD bagian 8 */"))).toHaveLength(1);
		expect(
			findViolations(file("# weekly backup (TRD 6)", "scripts/ops/backup.sh"))
		).toHaveLength(1);
	});

	test("leaves plain names, comments, urls and strings alone", () => {
		expect(findViolations(file('describe("queue", () => {}); // Retry-After wait'))).toEqual(
			[]
		);
		expect(findViolations(file('const url = "https://example.com/TR-1";'))).toEqual([]);
		expect(findViolations(file('readFileSync("docs/Terka_ERD.md")'))).toEqual([]);
	});

	test("the repository follows the rule", async () => {
		expect(findViolations(await repoFiles())).toEqual([]);
	});
});
