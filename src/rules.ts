// Every behavior number lives here once; the app, the content build and the tests read it from this module.
export const TARGET_RETENTION = 0.9;

export const MATURE_INTERVAL_DAYS = 21;
export const LEECH_LAPSES = 6;
export const SUSPEND_LAPSES = 8;
export const FUZZ_MIN_DAYS = 3;
export const FUZZ_RATIO = 0.05;

export const TIMED_LIMIT_MS = 8_000;
export const TRUE_FALSE_LIMIT_MS = 5_000;
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
export const ENGINE_VERSION = 3;

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
export const REVIEW_CAP_PER_DAY = 30;
export const REASK_GAP = 4;
export const RECHECK_AWAY_DAYS = 7;
export const RECHECK_SIZE = 20;

export const TIER_WINDOW_DAYS = 30;
export const TIER_MIN_REVIEWS = 200;
export const TIER_UP_ACCURACY = 0.9;
export const TIER_DOWN_ACCURACY = 0.8;
export const TIER_UP_MAX_HELD = 3;
export const TIER_DOWN_MIN_HELD = 11;
export const TIER_COOLDOWN_DAYS = 14;

export const STREAK_WINDOW_DAYS = 30;

export const ANSWER_RULES_VERSION = 1;
export const KILAT_ROUND_MS = 60_000;
export const SIGHTING_WINDOW_DAYS = 90;
export const SIGHTING_DEDUPE_MS = 600_000;
export const CHALLENGE_SIZE = 5;
export const RELATED_SKIP_LIMIT = 2;
export const PLACEMENT_PASS = { 1: 3, 2: 6 } as const;
export const PLACEMENT_EXPERT_SHARE = 0.7;

export const PREVIEW_STALE_MS = 600_000;
export const PREVIEW_MAX_INFO = 3;
export const KEYBOARD_HINT_SESSIONS = 5;
// Reading the result after each answer; tested through the duration KPI, not measured per user.
export const READ_MS = { intro: 10_000, other: 2_000 } as const;
export const NOMINAL_MS = {
	intro: 15_000,
	step: 10_000,
	drill: 8_000,
	set: 60_000,
	level: { 1: 4_000, 2: 6_000, 3: 9_000 }
} as const;

export const SET_MAX_ITEMS = 64;
export const KEY_GAPS_MAX = 120;
export const KEY_GAP_CAP_MS = 30_000;

export const NOTE_OFFER_LAPSES = 4;
export const NOTE_MAX_CHARS = 280;
// Shown in the consent dialog before sign-in; a newer required version arrives through sync.
export const PRIVACY_POLICY_VERSION = "2026-10-01";
// As long as an emailed code lives; on a shared device an older consent may be someone else's.
export const CONSENT_PENDING_MS = 60 * 60_000;
export const LOGIN_PROMPT_ACTIVE_DAYS = 7;
// The server's device_limit trigger repeats these two numbers; keep both in step.
export const ACTIVE_DEVICE_LIMIT = 20;
export const ACTIVE_DEVICE_DAYS = 90;
export const FACT_RECENT_MAX = 20;
export const FORECAST_DAYS = 14;
export const WEAKEST_LIMIT = 10;
// Placement ties and the Pemula suggestion start here; other groups follow data order.
export const SUGGESTED_GROUP_ORDER: readonly string[] = ["bali-nusa-tenggara", "jawa"];

export const OPTIMIZE_FIRST_REVIEWS = 1_000;
export const OPTIMIZE_FIRST_CARDS = 200;
export const OPTIMIZE_AGAIN_REVIEWS = 500;
export const OPTIMIZE_AGAIN_DAYS = 30;
// Newest share of the counted answers held out to compare new and current weights.
export const OPTIMIZE_TEST_SHARE = 0.2;
export const OPTIMIZE_MIN_GAIN = 0.01;
export const ROLLBACK_REVIEWS = 300;
export const ROLLBACK_MARGIN = 0.05;
// scripts/ops/db-size.sh repeats this number; keep both in step.
export const DB_SIZE_ALARM_BYTES = 157_286_400;
