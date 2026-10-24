import type { Bundle, Special } from "../content/schema";

export function specialCodeList(bundle: Bundle): {
	entries: Special[];
	first: number;
	last: number;
	gaps: number[];
} {
	const entries = [...bundle.specials].sort((a, b) => Number(a.number) - Number(b.number));
	const numbers = new Set(entries.map((entry) => Number(entry.number)));
	const first = Number(entries[0]?.number ?? 0);
	const last = Number(entries.at(-1)?.number ?? 0);
	const gaps: number[] = [];
	for (let number = first + 1; number < last; number++)
		if (!numbers.has(number)) gaps.push(number);
	return { entries, first, last, gaps };
}
