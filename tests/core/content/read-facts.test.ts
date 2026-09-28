import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { readFacts } from "../../../src/core/content/read-facts";

describe("facts reader", () => {
	test("reads draft and ready items with their line numbers", () => {
		const doc = [
			"## 2. Asal-usul",
			"",
			"1. **Draf · usulan label: legenda** — Cerita batalion.",
			"2. **Siap · label: terverifikasi** — Fakta siap."
		].join("\n");
		expect(readFacts(doc)).toEqual([
			{
				number: 1,
				line: 3,
				historyLabel: "legenda",
				publicationStatus: "draft",
				text: "Cerita batalion."
			},
			{
				number: 2,
				line: 4,
				historyLabel: "terverifikasi",
				publicationStatus: "ready",
				text: "Fakta siap."
			}
		]);
	});
	test("a malformed numbered bold line fails with its line number", () => {
		expect(() => readFacts("\n3. **Draf · label: legenda** — Salah.")).toThrow("line 2");
		expect(() => readFacts("4. **Draf · usulan label: mitos** — Label salah.")).toThrow(
			"line 1"
		);
		expect(() => readFacts("5. **Draf · usulan label: legenda** Tanpa pemisah.")).toThrow(
			"line 1"
		);
	});
	test("plain numbered lists without bold are ignored", () => {
		expect(readFacts("1. Periksa sumber.\n2. Catat tanggal.")).toEqual([]);
	});
	test("the real document has 50 draft items", async () => {
		const items = readFacts(await readFile("docs/Terka_Facts.md", "utf8"));
		expect(items).toHaveLength(50);
		expect(items.every((item) => item.publicationStatus === "draft")).toBe(true);
	});
});
