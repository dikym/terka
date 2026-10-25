import type { Measurements } from "@/core/session/commands";

/** Collects the answer signals of one question screen, from the moment it was shown. */
export function createMeasure(clock: () => number = () => performance.now()) {
	const shownAt = clock();
	let first: number | null = null;
	let last: number | null = null;
	const gaps: number[] = [];
	let length = 0;
	let deleted = 0;
	let changes = 0;
	let touch = false;
	let interrupted = false;
	return {
		input(value: string) {
			const at = clock();
			if (first === null) first = at;
			else if (last !== null) gaps.push(Math.round(at - last));
			last = at;
			deleted += Math.max(0, length - value.length);
			length = value.length;
		},
		choose() {
			const at = clock();
			if (first === null) first = at;
			else changes++;
		},
		pointer(type: string) {
			touch = type === "touch";
		},
		hidden() {
			interrupted = true;
		},
		finish(extra: { timedOut: boolean; optionCount: number | null }): Measurements {
			const at = clock();
			const typed = first !== null && last !== null && gaps.length > 0;
			return {
				msToFirstKey: first === null ? null : Math.round(first - shownAt),
				msTotal: Math.max(0, Math.round(at - shownAt)),
				msTyping: typed ? Math.round(last! - first!) : null,
				keyGapsMs: typed ? gaps : null,
				deletedChars: deleted,
				optionChanges: changes,
				optionCount: extra.optionCount,
				inputMode: touch ? "touch" : "keyboard",
				interrupted,
				timedOut: extra.timedOut
			};
		}
	};
}

export type Measure = ReturnType<typeof createMeasure>;
