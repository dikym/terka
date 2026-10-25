import { describe, expect, test } from "bun:test";
import { composition, infoNotes, typeRows } from "../../../src/lib/session/preview";

describe("session preview", () => {
	test("composition leaves out empty slots", () => {
		expect(composition({ step: 1, drill: 0, review: 2, new: 0 })).toEqual([
			["Pengulangan", 3, "bg-ink-1000"]
		]);
	});

	test("question types are counted by their label", () => {
		expect(typeRows(["Tebak daerah", "Tebak kode", "Tebak daerah"])).toEqual([
			["Tebak daerah", "2"],
			["Tebak kode", "1"]
		]);
	});

	test("info notes carry their counts and the rule numbers", () => {
		expect(
			infoNotes(["timed", "held"], { timed: 3, leech: 0, outside: 0, tier: null })
		).toEqual([
			["timer", "3", " soal Tebak berwaktu: mulai mengetik dalam 8 detik."],
			["circle-alert", null, "Materi baru dijeda hari ini agar sesi tetap ringan."]
		]);
	});
});
