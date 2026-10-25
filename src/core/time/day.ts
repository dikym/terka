const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

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

export function isTimeZone(tz: string): boolean {
	try {
		formatter(tz);
		return true;
	} catch {
		return false;
	}
}

function wallClock(at: number, tz: string) {
	const parts = formatter(tz).formatToParts(at);
	const get = (type: string) => parts.find((part) => part.type === type)!.value;
	return {
		date: `${get("year")}-${get("month")}-${get("day")}`,
		asUtc: Date.parse(
			`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
		)
	};
}

export function addDays(localDay: string, days: number): string {
	return new Date(Date.parse(`${localDay}T12:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function dayNumber(localDay: string): number {
	return Math.round(Date.parse(`${localDay}T00:00:00Z`) / DAY_MS);
}

export function localDay(at: number, tz: string): string {
	return wallClock(at, tz).date;
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
