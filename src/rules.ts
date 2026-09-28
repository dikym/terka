// Rule numbers owned by the SRD/TRD (PRD, "Pemilik angka"). The docs explain each number; code reads it here.
export const TIMED_LIMIT_MS = 8_000;
export const TRUE_FALSE_LIMIT_MS = 2_000;
export const MATURE_INTERVAL_DAYS = 21;
export const SET_THRESHOLD_MAX = 5;
export const SET_MIN_AREAS = 3;
export const FUZZ_MIN_DAYS = 3;
export const FUZZ_RATIO = 0.05;
export const ANSWER_MAX_CHARS = 120;
export const EXPORT_REMINDER_DAYS = 30;

// SRD 5.1: typo budget by the length of the canonical name without spaces.
export function typoThreshold(length: number): number {
	return length <= 4 ? 0 : length <= 7 ? 1 : length <= 11 ? 1.5 : 2;
}
