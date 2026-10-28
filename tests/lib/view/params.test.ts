import { describe, expect, test } from "bun:test";
import { paramsView } from "../../../src/lib/view/params";
import { answers, DAY, paramsRow } from "../../core/optimizer/fixtures";

const T0 = Date.parse("2026-10-01T10:00:00Z");
const TZ = "UTC";

describe("parameter status", () => {
	test("is the FSRS-6 default until a personal set is active", () => {
		const view = paramsView([], [], null, T0, TZ);
		expect(view.status.title).toBe("Bawaan FSRS-6");
		expect(view.history).toEqual([]);
	});

	test("names the day a personal set became active", () => {
		const row = paramsRow({ createdAt: T0, activatedAt: T0 });
		const view = paramsView([row], [row], null, T0 + DAY, TZ);
		expect(view.status.title).toBe("Pribadi");
		expect(view.status.note).toStartWith("Aktif sejak 1 Oktober 2026.");
	});
});

describe("parameter history", () => {
	const accepted = paramsRow({
		id: "a",
		createdAt: T0,
		activatedAt: T0,
		trainedReviewCount: 1_240
	});
	const rejected = paramsRow({
		id: "r",
		status: "rejected",
		activatedAt: null,
		createdAt: T0 + 40 * DAY,
		logloss: 0.319,
		baselineLogloss: 0.32
	});
	const restored = paramsRow({
		id: "p",
		createdAt: T0 + 60 * DAY,
		activatedAt: T0 + 60 * DAY,
		trainedReviewCount: 300,
		logloss: 0.32,
		baselineLogloss: 0.3
	});
	const view = paramsView(
		[accepted, restored],
		[accepted, restored, rejected],
		null,
		T0 + 61 * DAY,
		TZ
	);

	test("lists the newest decision first", () => {
		expect(view.history.map((row) => row.id)).toEqual(["p", "r", "a"]);
	});

	test("tells an accepted result from a rejected one and from a restore", () => {
		expect(view.history.map((row) => row.outcome)).toEqual([
			"restored",
			"rejected",
			"accepted"
		]);
		expect(view.history.map((row) => row.label)).toEqual(["Dipulihkan", "Ditolak", "Diterima"]);
	});

	test("shows how many answers a result used", () => {
		expect(view.history[2]!.detail).toBe("1.240 jawaban dipakai");
		expect(view.history[0]!.detail).toBe("300 jawaban diperiksa");
	});

	test("compares log loss and RMSE before and after, except for a restore", () => {
		expect(view.history[2]!.metrics).toEqual([
			{ name: "Log loss", before: "0,320", after: "0,300" },
			{ name: "RMSE", before: "0,060", after: "0,050" }
		]);
		expect(view.history[0]!.metrics).toBeNull();
	});

	test("dates each decision on the local day it was made", () => {
		expect(view.history[2]!.date).toBe("1 Oktober 2026");
	});
});

describe("progress toward the next optimization", () => {
	test("is not known until the counted answers are", () => {
		expect(paramsView([], [], null, T0, TZ).progress).toBeNull();
	});

	test("before the first run, measures answers and cards", () => {
		const progress = paramsView([], [], answers(640, 150), T0, TZ).progress!;
		expect(progress.title).toBe("Mengumpulkan data");
		expect(progress.lines).toEqual([
			{ label: "Jawaban terhitung", have: "640", need: "1.000", percent: 64, done: false },
			{ label: "Kartu berbeda", have: "150", need: "200", percent: 75, done: false }
		]);
	});

	test("says the requirements are met, without a bar running past full", () => {
		const progress = paramsView([], [], answers(1_240, 300), T0, TZ).progress!;
		expect(progress.title).toBe("Syarat terpenuhi");
		expect(progress.lines.map((line) => line.percent)).toEqual([100, 100]);
	});

	test("after a run, measures new answers and days since it", () => {
		const last = paramsRow({ createdAt: T0, activatedAt: T0 });
		const fresh = answers(120, 40, { from: T0 + 1 });
		const progress = paramsView([last], [last], fresh, T0 + 12.9 * DAY, TZ).progress!;
		expect(progress.lines).toEqual([
			{
				label: "Jawaban baru sejak optimasi terakhir",
				have: "120",
				need: "500",
				percent: 24,
				done: false
			},
			{
				label: "Hari sejak optimasi terakhir",
				have: "12",
				need: "30",
				percent: 40,
				done: false
			}
		]);
	});
});
