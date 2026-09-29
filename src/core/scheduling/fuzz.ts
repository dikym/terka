import { seeded } from "../random";
import { addDays, dayStart } from "../time/day";

export const FUZZ_MIN_DAYS = 3;
export const FUZZ_RATIO = 0.05;

export function fuzzDays(
	days: number,
	options: { today: string; tz: string; loadOn: (localDay: string) => number; seed: string }
): { days: number; due: number } {
	const base = Math.max(1, Math.round(days));
	let chosen = base;
	if (base >= FUZZ_MIN_DAYS) {
		const candidates: { days: number; load: number }[] = [];
		for (
			let offset = Math.round(base * (1 - FUZZ_RATIO));
			offset <= Math.round(base * (1 + FUZZ_RATIO));
			offset++
		)
			candidates.push({ days: offset, load: options.loadOn(addDays(options.today, offset)) });
		const least = Math.min(...candidates.map((candidate) => candidate.load));
		const best = candidates.filter((candidate) => candidate.load === least);
		chosen = best[Math.floor(seeded(options.seed)() * best.length)].days;
	}
	return { days: chosen, due: dayStart(addDays(options.today, chosen), options.tz) };
}
