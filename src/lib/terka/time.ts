import { DAY, type LearningClock } from "./model";

export function dateInZone(at: number, timezone: string): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).formatToParts(at);
	const get = (type: string) => parts.find((part) => part.type === type)!.value;
	return `${get("year")}-${get("month")}-${get("day")}`;
}

export function addDays(day: string, days: number): string {
	return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}

export function boundary(day: string, timezone: string): number {
	const desired = Date.parse(`${day}T04:00:00Z`);
	let guess = desired;
	for (let attempt = 0; attempt < 4; attempt++) {
		const parts = new Intl.DateTimeFormat("en-CA", {
			timeZone: timezone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23"
		}).formatToParts(guess);
		const get = (type: string) => parts.find((part) => part.type === type)!.value;
		const local = Date.parse(
			`${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}Z`
		);
		const correction = desired - local;
		if (!correction) break;
		guess += correction;
	}
	return guess;
}

export function createClock(
	now: number,
	timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
): LearningClock {
	let day = dateInZone(now, timezone);
	if (now < boundary(day, timezone)) day = addDays(day, -1);
	return {
		day,
		sequence: 0,
		timezone,
		nextBoundary: boundary(addDays(day, 1), timezone),
		lastSeen: now
	};
}

export function advanceClock(
	clock: LearningClock,
	now: number,
	timezone = clock.timezone
): LearningClock {
	if (!Number.isFinite(now) || now < 0) throw new Error("Invalid clock timestamp");
	const next = { ...clock };
	const effective = Math.max(now, clock.lastSeen);
	if (timezone !== next.timezone) {
		next.nextBoundary = Math.max(next.nextBoundary, boundary(addDays(next.day, 1), timezone));
		next.timezone = timezone;
	}
	while (effective >= next.nextBoundary) {
		const previousBoundary = next.nextBoundary;
		next.day = addDays(next.day, 1);
		next.sequence++;
		const localBoundary = boundary(next.day, timezone);
		next.nextBoundary = boundary(addDays(next.day, 1), timezone);
		const dayLength = next.nextBoundary - localBoundary;
		// After eastward travel, skip local dates that would grant a shortened extra day.
		while (next.nextBoundary < previousBoundary + dayLength) {
			next.day = addDays(next.day, 1);
			next.nextBoundary = boundary(addDays(next.day, 1), timezone);
		}
	}
	next.lastSeen = effective;
	return next;
}
