import { localDay } from "@/core/time/day";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

// A local day ("2026-10-25") read at noon UTC, so formatting never crosses a date line.
const noon = (day: string) => new Date(`${day}T12:00:00Z`);
const format = (options: Intl.DateTimeFormatOptions) =>
	new Intl.DateTimeFormat("id-ID", { ...options, timeZone: "UTC" });
const LONG = format({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
const SHORT = format({ day: "numeric", month: "long", year: "numeric" });
const WEEKDAY = format({ weekday: "long" });
const WEEKDAY_SHORT = format({ weekday: "short" });
const DAY_MONTH = format({ day: "numeric", month: "long" });

/** The local calendar day, as "Minggu, 25 Oktober 2026". */
export const dateLabel = (now: number, tz: string) => LONG.format(noon(localDay(now, tz)));

export const shortDate = (day: string) => SHORT.format(noon(day));
export const weekday = (day: string) => WEEKDAY.format(noon(day));
export const weekdayShort = (day: string) => WEEKDAY_SHORT.format(noon(day));
export const dayMonth = (day: string) => DAY_MONTH.format(noon(day));

export function ago(ms: number): string {
	if (ms < MINUTE) return "baru saja";
	if (ms < HOUR) return `${Math.floor(ms / MINUTE)} menit lalu`;
	if (ms < DAY) return `${Math.floor(ms / HOUR)} jam lalu`;
	return `${Math.floor(ms / DAY)} hari lalu`;
}

export function countdownTo(now: number, target: number): string {
	const total = Math.max(0, Math.floor((target - now) / 1000));
	const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
	return parts.map((part) => String(part).padStart(2, "0")).join(":");
}

export function dueIn(ms: number): string {
	if (ms < HOUR) return `diulang lagi dalam ${Math.max(1, Math.round(ms / MINUTE))} menit`;
	if (ms < 2 * DAY) return `diulang lagi dalam ${Math.round(ms / HOUR)} jam`;
	return `diulang lagi dalam ${Math.round(ms / DAY)} hari`;
}

export const durationLabel = (
	range: { kind: "under-minute" } | { kind: "minutes"; min: number; max: number }
) =>
	range.kind === "under-minute"
		? "Kurang dari 1 menit"
		: range.min === range.max
			? `Sekitar ${range.min} menit waktu aktif`
			: `Sekitar ${range.min}–${range.max} menit waktu aktif`;

/** Indonesian decimal comma: 2.1 → "2,1". */
export const decimal = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

/** Thousands with a dot: 1240 → "1.240". */
export const count = (value: number) => value.toLocaleString("id-ID");

export const TIER_NAME = {
	pemula: "Pemula",
	menengah: "Menengah",
	mahir: "Mahir",
	ahli: "Ahli"
} as const;

/** "07.30", the Indonesian way of writing a time. */
export const clock = (at: number, tz: string) =>
	new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: tz })
		.format(at)
		.replace(":", ".");
