import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { readFacts } from "../../../src/core/content/read-facts";

const SOURCES = [
	"## 11. Daftar Sumber",
	"",
	"| ID | Judul | Penerbit | Jenis | Tanggal | Diperiksa | URL | URL asli | Lokasi |",
	"| - | - | - | - | - | - | - | - | - |",
	"| `blog` | Blog | Blog | media | 2018 | 2026-10-01 | https://x.example | — | Paragraf 1 |",
	""
];
const doc = (lines: string[]) => [...lines, "", ...SOURCES].join("\n");

describe("facts reader", () => {
	test("reads items with their source line, label and line numbers", () => {
		const result = readFacts(
			doc([
				"## 4. Asal-usul",
				"",
				"1. **Siap · label: mitos** — Cerita batalion.",
				"",
				"   Sumber: `blog`, `kompas` · diperiksa 2026-10-01",
				"",
				"2. **Draf · usulan label: terverifikasi** — Fakta draf."
			])
		);
		expect(result.facts).toEqual([
			{
				ref: 1,
				line: 3,
				historyLabel: "mitos",
				publicationStatus: "ready",
				text: "Cerita batalion.",
				source: ["blog", "kompas"],
				sourceCheckedAt: "2026-10-01"
			},
			{
				ref: 2,
				line: 7,
				historyLabel: "terverifikasi",
				publicationStatus: "draft",
				text: "Fakta draf.",
				source: [],
				sourceCheckedAt: null
			}
		]);
		expect(result.sources[0]).toMatchObject({ id: "blog", date: "2018", originalUrl: null });
	});
	test("a fact without a source line has no sources", () => {
		const result = readFacts(doc(["1. **Siap · label: terverifikasi** — Tanpa sumber."]));
		expect(result.facts[0]).toMatchObject({ source: [], sourceCheckedAt: null });
	});
	test("a malformed numbered bold line fails with its line number", () => {
		expect(() => readFacts(doc(["", "3. **Siap · usulan label: mitos** — Salah."]))).toThrow(
			"line 2"
		);
		expect(() => readFacts(doc(["4. **Siap · label: legenda** — Label lama."]))).toThrow(
			"line 1"
		);
		expect(() => readFacts(doc(["5. **Siap · label: mitos** Tanpa pemisah."]))).toThrow(
			"line 1"
		);
	});
	test("a source line before any fact fails", () => {
		expect(() => readFacts(doc(["Sumber: `blog` · diperiksa 2026-10-01"]))).toThrow("line 1");
	});
	test("plain numbered lists without bold are ignored", () => {
		expect(readFacts(doc(["1. Periksa sumber.", "2. Catat tanggal."])).facts).toEqual([]);
	});
	test("the real document has 41 ready items with sources", async () => {
		const result = readFacts(await readFile("docs/Terka_Fun_Facts.md", "utf8"));
		expect(result.facts).toHaveLength(41);
		expect(result.facts.every((item) => item.publicationStatus === "ready")).toBe(true);
		expect(result.facts.every((item) => item.source.length > 0)).toBe(true);
		expect(result.sources).toHaveLength(33);
	});
});
