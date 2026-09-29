// Every behavior number lives here once; the app, the content build and the tests read it from this module.
export const TARGET_RETENTION = 0.9;
export const DAY_BOUNDARY_HOUR = 4;

export const FIRST_STEP_MS = 60_000;
export const SECOND_STEP_MS = 600_000;
export const MATURE_INTERVAL_DAYS = 21;
export const LEECH_LAPSES = 6;
export const SUSPEND_LAPSES = 8;
export const FUZZ_MIN_DAYS = 3;
export const FUZZ_RATIO = 0.05;

export const TIMED_LIMIT_MS = 8_000;
export const TRUE_FALSE_LIMIT_MS = 2_000;
export const PLACEMENT_LIMIT_MS = 15_000;
export const PLACEMENT_FAST_MS = 3_000;
export const PLACEMENT_STAGE_SIZES = { common: 8, medium: 10, rare: 10 } as const;

export const FLUENCY_WINDOW = 200;
export const FLUENCY_MIN_SAMPLES = 30;
export const INTERRUPTED_LATENCY_MS = 60_000;
export const LONG_GAP_MS = 1_200;
export const DELETED_SHARE = 0.3;

export const SET_THRESHOLD_MAX = 5;
export const SET_MIN_AREAS = 3;
export const ANSWER_MAX_CHARS = 120;
export const EXPORT_REMINDER_DAYS = 30;

// Typo budget by the length of the canonical name without spaces; short names get none.
export function typoThreshold(length: number): number {
	return length <= 4 ? 0 : length <= 7 ? 1 : length <= 11 ? 1.5 : 2;
}
