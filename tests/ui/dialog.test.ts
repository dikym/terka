import { expect, test } from "bun:test";
import { typedMatches } from "../../src/components/ui/dialog";

test("the typed confirmation needs the word exactly, in capitals", () => {
	expect(typedMatches("HAPUS", "HAPUS")).toBe(true);
	expect(typedMatches("HAPUS", "hapus")).toBe(false);
	expect(typedMatches("HAPUS", " HAPUS ")).toBe(false);
	expect(typedMatches("HAPUS", "")).toBe(false);
});
