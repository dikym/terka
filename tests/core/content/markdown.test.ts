import { describe, expect, test } from "bun:test";
import { listCell, readField, readTable, sectionLines } from "../../../src/core/content/markdown";

const doc = [
	"# Judul",
	"**Versi data kode khusus:** 2026.09.24",
	"",
	"## 1. Satu",
	"",
	"Sumber seluruh baris: `perpol`.",
	"",
	"| A | B |",
	"| - | - |",
	"| `x` | `a`, `b` |",
	"| y | — |",
	"",
	"## 2. Dua",
	"| A | B |",
	"| - | - |",
	"| z |",
	""
].join("\n");

describe("markdown table reader", () => {
	test("reads rows with document line numbers and strips a single backtick pair", () => {
		const rows = readTable(doc, "## 1. Satu", ["A", "B"]);
		expect(rows).toEqual([
			{ line: 10, cells: { A: "x", B: "`a`, `b`" } },
			{ line: 11, cells: { A: "y", B: "—" } }
		]);
	});
	test("list cells split on commas and drop backticks", () => {
		expect(listCell("`a`, `b`")).toEqual(["a", "b"]);
		expect(listCell("perpol")).toEqual(["perpol"]);
		expect(listCell("—")).toEqual([]);
	});
	test("a renamed column fails with the expected header list", () => {
		expect(() => readTable(doc, "## 1. Satu", ["A", "C"])).toThrow("expected columns A | C");
	});
	test("a row with the wrong cell count fails with its line number", () => {
		expect(() => readTable(doc, "## 2. Dua", ["A", "B"])).toThrow("line 16");
	});
	test("a missing section fails", () => {
		expect(() => readTable(doc, "## 9. Tidak ada", ["A"])).toThrow("section not found");
	});
	test("section lines stop at the next heading of the same or higher level", () => {
		expect(sectionLines(doc, "## 1. Satu").map((line) => line.line)).toEqual([
			5, 6, 7, 8, 9, 10, 11, 12
		]);
	});
	test("fields read the bold label line", () => {
		expect(readField(doc, "Versi data kode khusus")).toBe("2026.09.24");
		expect(() => readField(doc, "Tidak ada")).toThrow("field not found");
	});
});
