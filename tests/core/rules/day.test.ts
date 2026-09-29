import { describe, expect, test } from "bun:test";
import { addDays, dayNumber, dayStart, localDay, nextLocalDay } from "../../../src/core/time/day";

const WITA = "Asia/Makassar";
const WIB = "Asia/Jakarta";
const WIT = "Asia/Jayapura";

describe("local day", () => {
	test("03:59 WITA is still the previous day, 04:00 starts the next", () => {
		expect(localDay(Date.parse("2026-09-21T03:59:00+08:00"), WITA)).toBe("2026-09-20");
		expect(localDay(Date.parse("2026-09-21T04:00:00+08:00"), WITA)).toBe("2026-09-21");
	});
	test("23:00 and 01:00 the next night are the same learning day", () => {
		expect(localDay(Date.parse("2026-09-21T23:00:00+08:00"), WITA)).toBe("2026-09-21");
		expect(localDay(Date.parse("2026-09-22T01:00:00+08:00"), WITA)).toBe("2026-09-21");
	});
	test("a later zone change does not rewrite an answer's recorded day", () => {
		const at = Date.parse("2026-09-21T03:30:00+07:00");
		const recorded = { localDay: localDay(at, WIB), tz: WIB };
		expect(recorded.localDay).toBe("2026-09-20");
		nextLocalDay(at + 3_600_000, WIT, recorded);
		expect(recorded).toEqual({ localDay: "2026-09-20", tz: WIB });
		expect(localDay(at, WIB)).toBe("2026-09-20");
	});
	test("dayStart is 04:00 local and round-trips through localDay", () => {
		const start = dayStart("2026-09-21", WITA);
		expect(start).toBe(Date.parse("2026-09-21T04:00:00+08:00"));
		expect(localDay(start, WITA)).toBe("2026-09-21");
		expect(localDay(start - 1, WITA)).toBe("2026-09-20");
	});
	test("Europe/Berlin keeps one boundary per date across daylight saving", () => {
		const berlin = "Europe/Berlin";
		expect(dayStart("2026-03-30", berlin) - dayStart("2026-03-29", berlin)).toBe(
			24 * 3_600_000
		);
		expect(dayStart("2026-03-29", berlin) - dayStart("2026-03-28", berlin)).toBe(
			23 * 3_600_000
		);
		expect(dayStart("2026-10-25", berlin) - dayStart("2026-10-24", berlin)).toBe(
			25 * 3_600_000
		);
		expect(localDay(Date.parse("2026-03-29T03:30:00+02:00"), berlin)).toBe("2026-03-28");
	});
	test("addDays and dayNumber handle leap years", () => {
		expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(dayNumber("1970-01-02")).toBe(1);
		expect(dayNumber("2026-09-22") - dayNumber("2026-09-21")).toBe(1);
	});
	test("travelling east does not start a new day before the old zone's 04:00", () => {
		const last = { localDay: "2026-09-20", tz: WIB };
		// 03:30 WIB = 05:30 WIT: WIT says a new day started, WIB has not reached 04:00 yet.
		const at = Date.parse("2026-09-21T03:30:00+07:00");
		expect(localDay(at, WIT)).toBe("2026-09-21");
		expect(nextLocalDay(at, WIT, last)).toBe("2026-09-20");
		expect(nextLocalDay(Date.parse("2026-09-21T04:00:00+07:00"), WIT, last)).toBe("2026-09-21");
	});
	test("travelling west never moves the day backwards", () => {
		const last = { localDay: "2026-09-21", tz: WITA };
		// 04:30 WITA = 03:30 WIB: WIB alone would say 2026-09-20.
		const at = Date.parse("2026-09-21T04:30:00+08:00");
		expect(localDay(at, WIB)).toBe("2026-09-20");
		expect(nextLocalDay(at, WIB, last)).toBe("2026-09-21");
		const back = nextLocalDay(Date.parse("2026-09-22T03:30:00+07:00"), WITA, {
			localDay: "2026-09-21",
			tz: WIB
		});
		expect(back).toBe("2026-09-21");
	});
});
