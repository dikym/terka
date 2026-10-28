const formatters = new Map<string, Intl.DateTimeFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

// format() costs several times less than formatToParts, and replay asks for the local day of every
// event. Output in any other shape falls back to the parts.
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})\D+(\d{2}):(\d{2}):(\d{2})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function formatter(tz: string): Intl.DateTimeFormat {
	let format = formatters.get(tz);
	if (!format) {
		format = new Intl.DateTimeFormat("en-CA", {
			timeZone: tz,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23"
		});
		formatters.set(tz, format);
	}
	return format;
}

function dateFormatter(tz: string): Intl.DateTimeFormat {
	let format = dateFormatters.get(tz);
	if (!format) {
		format = new Intl.DateTimeFormat("en-CA", {
			timeZone: tz,
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		});
		dateFormatters.set(tz, format);
	}
	return format;
}

export function isTimeZone(tz: string): boolean {
	try {
		formatter(tz);
		return true;
	} catch {
		return false;
	}
}

function wallClock(at: number, tz: string) {
	const match = WALL_CLOCK.exec(formatter(tz).format(at));
	if (match)
		return {
			date: `${match[1]}-${match[2]}-${match[3]}`,
			asUtc: Date.UTC(
				+match[1]!,
				+match[2]! - 1,
				+match[3]!,
				+match[4]!,
				+match[5]!,
				+match[6]!
			)
		};
	const parts = formatter(tz).formatToParts(at);
	const get = (type: string) => parts.find((part) => part.type === type)!.value;
	return {
		date: `${get("year")}-${get("month")}-${get("day")}`,
		asUtc: Date.parse(
			`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
		)
	};
}

// Calendar arithmetic on day numbers (days since 1970-01-01): replay moves between days for every
// event and every window, and building and parsing a Date each time showed up in its profile.
function daysFromCivil(year: number, month: number, day: number): number {
	const y = month <= 2 ? year - 1 : year;
	const era = Math.floor(y / 400);
	const yearOfEra = y - era * 400;
	const dayOfYear = Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
	const dayOfEra =
		yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
	return era * 146_097 + dayOfEra - 719_468;
}

const written = new Map<number, string>();

function civilFromDays(days: number): string {
	const known = written.get(days);
	if (known !== undefined) return known;
	const text = formatCivil(days);
	written.set(days, text);
	return text;
}

function formatCivil(days: number): string {
	const z = days + 719_468;
	const era = Math.floor(z / 146_097);
	const dayOfEra = z - era * 146_097;
	const yearOfEra = Math.floor(
		(dayOfEra -
			Math.floor(dayOfEra / 1_460) +
			Math.floor(dayOfEra / 36_524) -
			Math.floor(dayOfEra / 146_096)) /
			365
	);
	const dayOfYear =
		dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
	const shifted = Math.floor((5 * dayOfYear + 2) / 153);
	const day = dayOfYear - Math.floor((153 * shifted + 2) / 5) + 1;
	const month = shifted < 10 ? shifted + 3 : shifted - 9;
	const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
	return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dayNumber(localDay: string): number {
	return daysFromCivil(+localDay.slice(0, 4), +localDay.slice(5, 7), +localDay.slice(8, 10));
}

export function addDays(localDay: string, days: number): string {
	return civilFromDays(dayNumber(localDay) + days);
}

export function localDay(at: number, tz: string): string {
	const text = dateFormatter(tz).format(at);
	return DATE.test(text) ? text : wallClock(at, tz).date;
}

// The instant whose local wall clock reads `localDay` 00:00.
export function dayStart(localDay: string, tz: string): number {
	const desired = Date.parse(`${localDay}T00:00:00Z`);
	let guess = desired;
	for (let attempt = 0; attempt < 4; attempt++) {
		const correction = desired - wallClock(guess, tz).asUtc;
		if (!correction) return guess;
		guess += correction;
	}
	// A DST jump skipped midnight, so the guesses swing across the gap; the later one is where the day starts.
	return Math.max(guess, guess + desired - wallClock(guess, tz).asUtc);
}

// Never go back, and never start a new day before the previous zone's midnight.
export function nextLocalDay(
	at: number,
	tz: string,
	last?: { localDay: string; tz: string }
): string {
	const current = localDay(at, tz);
	if (!last || current <= last.localDay) return last?.localDay ?? current;
	return at < dayStart(addDays(last.localDay, 1), last.tz) ? last.localDay : current;
}
