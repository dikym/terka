import { STREAK_WINDOW_DAYS } from "@/rules";
import { addDays, dayNumber } from "../time/day";

// One missed day is forgiven per rolling 30 days; a second one inside that window resets the count.
export function streak(days: ReadonlySet<string>, today: string): number {
	if (!days.size) return 0;
	let count = 0;
	let misses: number[] = [];
	for (let day = [...days].sort()[0]; day <= today; day = addDays(day, 1)) {
		if (days.has(day)) {
			count++;
			continue;
		}
		if (day === today || count === 0) continue;
		const number = dayNumber(day);
		misses = misses.filter((miss) => number - miss < STREAK_WINDOW_DAYS);
		if (misses.length) {
			count = 0;
			misses = [];
		} else misses.push(number);
	}
	return count;
}
