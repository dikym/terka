import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { addMonths, readSpecials, specialId } from "../../../src/core/content/read-specials";

const doc = (cdRows: string[], sourceLine = "Sumber seluruh baris: `perpol`, hlm. 99.") =>
	[
		"# Kode Khusus",
		"**Versi data kode khusus:** 2026.09.24",
		"",
		"## 2. Format Pelat Khusus",
		"",
		"| Kode | Pemakai | Susunan menurut Perpol 7/2021 | Contoh di lampiran | Status di Terka | Sumber | Catatan |",
		"| - | - | - | - | - | - | - |",
		"| CD | Korps diplomatik | CD + kode negara | CD 12 5 | Latihan | `perpol` | — |",
		"| RI | Presiden | RI + nomor urut | RI 1 | Referensi | `perpol` | Tidak ada daftar lengkap. |",
		"",
		"## 4. Daftar Kode CD",
		"",
		sourceLine,
		"",
		"| Kode | Pemegang (nama tampil) | Tipe | Tertulis di lampiran | Alias yang diterima | Label | Tinjau |",
		"| - | - | - | - | - | - | - |",
		...cdRows,
		"",
		"## 8. Daftar Sumber",
		"",
		"| ID | Judul | Penerbit | Jenis | Tanggal | Diperiksa | URL | URL asli | Lokasi |",
		"| - | - | - | - | - | - | - | - | - |",
		"| `perpol` | Lampiran | Polri | peraturan | 2021-05-05 | 2026-09-24 | https://x.example | — | D4 |",
		""
	].join("\n");

describe("special plates reader", () => {
	test("reads a CD row, derives id, sources and dates", () => {
		const result = readSpecials(
			doc([
				"| CD 12 | Amerika Serikat | negara | Amerika Serikat | AS, USA | `high` | — |",
				"| CD 92 | PTRI untuk ASEAN | organisasi | PTRI ASEAN | — | `high` | ya |"
			])
		);
		expect(result.specialsVersion).toBe("2026.09.24");
		expect(result.specials[0]).toEqual({
			id: "cd-12-amerika-serikat",
			series: "CD",
			number: "12",
			holder: "Amerika Serikat",
			holderType: "country",
			aliases: ["AS", "USA"],
			sourceName: "Amerika Serikat",
			confidence: "high",
			needsReview: false,
			sources: ["perpol"],
			validFrom: "2021-05-05",
			reviewBy: "2027-03-24"
		});
		expect(result.specials[1]).toMatchObject({
			id: "cd-92-ptri-untuk-asean",
			holderType: "organization",
			aliases: [],
			needsReview: true
		});
		expect(result.sources[0]).toEqual({
			id: "perpol",
			title: "Lampiran",
			publisher: "Polri",
			type: "peraturan",
			date: "2021-05-05",
			checkedAt: "2026-09-24",
			url: "https://x.example",
			originalUrl: null,
			locator: "D4"
		});
	});

	test("reads RI/CC/CH format rows as reference plates and skips the CD row", () => {
		const result = readSpecials(doc([]));
		expect(result.referencePlates).toEqual([
			{
				id: "ref-ri-format",
				series: "RI",
				number: null,
				label: "Presiden; format RI + nomor urut",
				confidence: "high",
				sources: ["perpol"],
				note: "Tidak ada daftar lengkap.",
				reviewBy: "2027-03-24"
			}
		]);
	});

	test("an unknown holder type fails with its line number", () => {
		expect(() =>
			readSpecials(
				doc(["| CD 12 | Amerika Serikat | benua | Amerika Serikat | — | `high` | — |"])
			)
		).toThrow("line 17");
	});

	test('a code that is not "CD <number>" fails', () => {
		expect(() =>
			readSpecials(doc(["| CC 12 | Amerika | negara | Amerika | — | `high` | — |"]))
		).toThrow("CD <number>");
	});

	test("the list must name its sources", () => {
		expect(() => readSpecials(doc([], "Tanpa sumber."))).toThrow("Sumber seluruh baris");
	});

	test("sources stop at the first non-id token, ignoring later backtick spans in the same line", () => {
		const result = readSpecials(
			doc(
				["| CD 12 | Amerika Serikat | negara | Amerika Serikat | — | `high` | — |"],
				"Sumber seluruh baris: `perpol`, hlm. 99. Kolom **Tipe** memakai `country` atau `organization`."
			)
		);
		for (const special of result.specials) expect(special.sources).toEqual(["perpol"]);
	});

	test("ids stay within 32 characters and end on a word boundary", () => {
		// "cd-112-utusan-sekretaris-jenderal" would be 33 characters, so the last word is dropped.
		expect(specialId("112", "Utusan Sekretaris Jenderal Perserikatan Bangsa-Bangsa")).toBe(
			"cd-112-utusan-sekretaris"
		);
		expect(specialId("114", "Bosnia dan Herzegovina").length).toBeLessThanOrEqual(32);
		expect(specialId("17", "Vatikan")).toMatch(/^[a-z0-9-]{1,32}$/);
	});

	test("a first word that alone exceeds the remaining budget is hard-cut, never left empty", () => {
		const id = specialId("1234567890123456789012345", "Indonesia");
		expect(id).not.toBe("cd-1234567890123456789012345-");
		expect(id.endsWith("-")).toBe(false);
		expect(id.length).toBeGreaterThan("cd-1234567890123456789012345-".length - 1);
	});

	test("an invalid Tanggal in §8 Daftar Sumber fails and names the column", () => {
		const markdown = doc([
			"| CD 12 | Amerika Serikat | negara | Amerika Serikat | — | `high` | — |"
		]).replace(
			"| `perpol` | Lampiran | Polri | peraturan | 2021-05-05 | 2026-09-24 | https://x.example | — | D4 |",
			"| `perpol` | Lampiran | Polri | peraturan | kemarin | 2026-09-24 | https://x.example | — | D4 |"
		);
		expect(() => readSpecials(markdown)).toThrow("Tanggal");
	});

	test("an invalid Diperiksa in §8 Daftar Sumber fails and names the column", () => {
		const markdown = doc([
			"| CD 12 | Amerika Serikat | negara | Amerika Serikat | — | `high` | — |"
		]).replace(
			"| `perpol` | Lampiran | Polri | peraturan | 2021-05-05 | 2026-09-24 | https://x.example | — | D4 |",
			"| `perpol` | Lampiran | Polri | peraturan | 2021-05-05 | 24-09-2026 | https://x.example | — | D4 |"
		);
		expect(() => readSpecials(markdown)).toThrow("Diperiksa");
	});

	test("a markdown reader error is prefixed with the file name", () => {
		const withoutSources = doc([]).split("## 8. Daftar Sumber")[0];
		expect(() => readSpecials(withoutSources)).toThrow("Terka_Kode_Khusus.md");
		expect(() => readSpecials(withoutSources)).toThrow("section not found");
	});

	test("addMonths keeps the day of month", () => {
		expect(addMonths("2026-09-24", 6)).toBe("2027-03-24");
	});

	test("TR-166: the real document yields 130 CD entries, CD 92 under review and three format entries", async () => {
		const result = readSpecials(await readFile("docs/Terka_Kode_Khusus.md", "utf8"));
		expect(result.specials).toHaveLength(130);
		expect(
			result.specials.filter((entry) => entry.needsReview).map((entry) => entry.number)
		).toEqual(["92"]);
		expect(new Set(result.referencePlates.map((plate) => plate.series))).toEqual(
			new Set(["RI", "CC", "CH"])
		);
		for (const special of result.specials)
			expect(special.sources).toEqual(["perpol-7-2021-lampiran"]);
	});
});
