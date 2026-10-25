import { expect, test } from "bun:test";
import { dataChanges } from "../../../src/lib/view/changes";
import { intro, NOW, ruleBundle, stateOf } from "../../core/replay/fixtures";

test("without suspended material the change list says nothing moved", () => {
	const bundle = ruleBundle();
	const view = dataChanges(stateOf([]), bundle, null);
	expect(view.to).toBe(bundle.version);
	expect(view.items).toEqual([
		{
			title: "Tidak ada perubahan pada kode yang sedang dipelajari.",
			note: "Riwayat belajar tetap utuh."
		}
	]);
});

test("a learned code whose data dropped is listed as switched off", () => {
	const bundle = ruleBundle();
	const state = stateOf([intro("bk", NOW)]);
	state.content.set("bk", "confidence");
	expect(dataChanges(state, bundle, null).items[0]).toEqual({
		title: "1 kode dinonaktifkan",
		note: "Dinonaktifkan, data perlu diverifikasi"
	});
});
