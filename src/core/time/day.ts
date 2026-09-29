const DAY_MS = 86_400_000;
const BOUNDARY_HOUR = 4;

function wallClock(at: number, tz: string) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23"
	}).formatToParts(at);
	const get = (type: string) => parts.find((part) => part.type === type)!.value;
	return {
		date: `${get("year")}-${get("month")}-${get("day")}`,
		hour: Number(get("hour")),
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

// SRD 4.9: the learning day changes at 04:00 local time.
export function localDay(at: number, tz: string): string {
	const clock = wallClock(at, tz);
	return clock.hour < BOUNDARY_HOUR ? addDays(clock.date, -1) : clock.date;
}

// The instant whose local wall clock reads `localDay` 04:00 (DST shifts happen before 04:00).
export function dayStart(localDay: string, tz: string): number {
	const desired = Date.parse(`${localDay}T0${BOUNDARY_HOUR}:00:00Z`);
	let guess = desired;
	for (let attempt = 0; attempt < 4; attempt++) {
		const correction = desired - wallClock(guess, tz).asUtc;
		if (!correction) break;
		guess += correction;
	}
	return guess;
}

// SRD 4.9 travel rule: never go back, and never start a new day before the previous zone's 04:00.
export function nextLocalDay(
	at: number,
	tz: string,
	last?: { localDay: string; tz: string }
): string {
	const current = localDay(at, tz);
	if (!last || current <= last.localDay) return last?.localDay ?? current;
	return at < dayStart(addDays(last.localDay, 1), last.tz) ? last.localDay : current;
}
