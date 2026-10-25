import { describe, expect, test } from "bun:test";
import { coverageView } from "../../../src/lib/view/coverage";
import { settingsView } from "../../../src/lib/view/settings";
import { intro, NOW, ruleBundle, stateOf, WITA } from "../../core/replay/fixtures";
import { SETTINGS } from "../../core/session/fixtures";

const bundle = ruleBundle();

describe("coverage view", () => {
	test("the national row counts every province and code", () => {
		const view = coverageView(stateOf([]), bundle);
		expect(view.national.codes).toBe(bundle.regions.length);
		expect(view.national.provinces).toBe(new Set(bundle.regions.map((r) => r.province)).size);
		expect(view.national.percent).toBe(0);
	});

	test("groups use the design ids and list their provinces in data order", () => {
		const view = coverageView(stateOf([]), bundle);
		const bali = view.groups.find((group) => group.id === "balinusra")!;
		expect(bali.bundleId).toBe("bali-nusa-tenggara");
		expect(bali.provinces.map((province) => province.codes)).toEqual([["DK"], ["DR", "EA"]]);
	});

	test("an introduced code is no longer new material", () => {
		const before = coverageView(stateOf([]), bundle).national.newAvailable;
		const after = coverageView(stateOf([intro("bk", NOW)]), bundle).national.newAvailable;
		expect(after).toBe(before - 1);
	});
});

describe("settings view", () => {
	test("the default tier sets the new material limit and the hold", () => {
		const view = settingsView(stateOf([]), bundle, SETTINGS, true, NOW, WITA);
		expect(view.newPerDay).toBe("10");
		expect(view.holdAt).toBe("40 soal");
		expect(view.newPerDayNote).toBe(
			"Mengikuti Tingkat: Menengah. Disesuaikan otomatis dari riwayat, paling cepat 14 hari sekali."
		);
		expect(view.scope).toBe("Seluruh Indonesia. Diubah dari tab Cakupan.");
		expect(view.timeLimit).toBe("8 detik");
		expect(view.retention).toBe("0,90");
		expect(view.params).toBe(
			"Parameter bawaan. Parameter pribadi dibuat setelah 1000 jawaban."
		);
	});
});
