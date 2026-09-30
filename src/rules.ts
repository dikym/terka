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

// Raise on any change to ts-fsrs, GRADE_RULES_VERSION or queue rules; clients then replay in full.
export const ENGINE_VERSION = 1;

export const TIERS = {
	pemula: { newPerDay: 8, hold: 40 },
	menengah: { newPerDay: 10, hold: 40 },
	mahir: { newPerDay: 12, hold: 32 },
	ahli: { newPerDay: 13, hold: 28 }
} as const;
export type Tier = keyof typeof TIERS;
export const TIER_ORDER: readonly Tier[] = ["pemula", "menengah", "mahir", "ahli"];
export const DEFAULT_TIER: Tier = "menengah";
export const SPECIAL_NEW_PER_DAY = 5;
export const SPECIAL_HOLD = 25;

export const UNLOCK_REVERSE_DAYS = 7;
export const UNLOCK_SET_DAYS = 14;

export const PAIR_WINDOW_DAYS = 30;
export const PAIR_THRESHOLD = 3;
export const PAIR_RETHRESHOLD = 2;
export const DRILL_CLEAR_STREAK = 5;

export const TIER_WINDOW_DAYS = 30;
export const TIER_MIN_REVIEWS = 200;
export const TIER_UP_ACCURACY = 0.9;
export const TIER_DOWN_ACCURACY = 0.8;
export const TIER_UP_MAX_HELD = 3;
export const TIER_DOWN_MIN_HELD = 11;
export const TIER_COOLDOWN_DAYS = 14;

export const STREAK_WINDOW_DAYS = 30;
