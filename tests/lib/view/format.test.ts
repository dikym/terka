import { describe, expect, test } from "bun:test";
import { ago, countdownTo, dateLabel, dueIn, shortDate } from "../../../src/lib/view/format";

describe("formatting", () => {
	test("relative times read in minutes, hours or days", () => {
		expect(ago(10_000)).toBe("baru saja");
		expect(ago(3 * 60_000)).toBe("3 menit lalu");
		expect(ago(2 * 3_600_000)).toBe("2 jam lalu");
		expect(ago(4 * 86_400_000)).toBe("4 hari lalu");
	});

	test("a countdown shows hours, minutes and seconds", () => {
		expect(countdownTo(0, 3_723_000)).toBe("01:02:03");
		expect(countdownTo(5_000, 0)).toBe("00:00:00");
	});

	test("the date label follows the learning day, which starts at 04:00", () => {
		expect(dateLabel(Date.parse("2026-10-25T10:00:00+07:00"), "Asia/Jakarta")).toBe(
			"Minggu, 25 Oktober 2026"
		);
		expect(dateLabel(Date.parse("2026-10-26T02:00:00+07:00"), "Asia/Jakarta")).toBe(
			"Minggu, 25 Oktober 2026"
		);
	});

	test("a short date names the day and month", () => {
		expect(shortDate("2026-10-05")).toBe("5 Oktober 2026");
	});

	test("the next review is named in hours under two days, else days", () => {
		expect(dueIn(30 * 3_600_000)).toBe("diulang lagi dalam 30 jam");
		expect(dueIn(3 * 86_400_000)).toBe("diulang lagi dalam 3 hari");
		expect(dueIn(30 * 60_000)).toBe("diulang lagi dalam 30 menit");
	});
});
