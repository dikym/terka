import { expect, test } from "bun:test";
import { coverageOf } from "../../scripts/ci/coverage";

const lcov = [
	"SF:src/core/a.ts",
	"LF:10",
	"LH:9",
	"end_of_record",
	"SF:src/core/b.ts",
	"LF:30",
	"LH:27",
	"end_of_record",
	"SF:src/lib/c.ts",
	"LF:100",
	"LH:1",
	"end_of_record"
].join("\n");

test("sums line coverage of the files under a prefix", () => {
	expect(coverageOf(lcov, "src/core/")).toEqual({ hit: 36, found: 40 });
});

test("ignores files outside the prefix", () => {
	expect(coverageOf(lcov, "src/lib/")).toEqual({ hit: 1, found: 100 });
});
