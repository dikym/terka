import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import { paramsAt } from "@/core/replay/params";
import type { SessionSettings } from "@/core/session/context";
import { localDay } from "@/core/time/day";
import {
	OPTIMIZE_FIRST_REVIEWS,
	SPECIAL_NEW_PER_DAY,
	TARGET_RETENTION,
	TIER_COOLDOWN_DAYS,
	TIERS,
	TIMED_LIMIT_MS
} from "@/rules";
import { decimal, shortDate, TIER_NAME } from "./format";
import { scopeTitle } from "./groups";

export type Settings = {
	newPerDay: string;
	newPerDayNote: string;
	holdAt: string;
	scope: string;
	diplomatEnabled: boolean;
	diplomatPerDay: string;
	timeLimit: string;
	data: { version: string; regions: string; diplomats: string };
	params: string;
	retention: string;
	persisted: boolean;
	contact: string;
};

export function settingsView(
	state: AppState,
	bundle: Bundle,
	settings: SessionSettings,
	persisted: boolean,
	now: number,
	tz: string
): Settings {
	const tier = state.tier.current;
	const active = paramsAt(state.params, now);
	const since = active?.activatedAt ?? null;
	return {
		newPerDay: String(TIERS[tier].newPerDay),
		newPerDayNote: `Mengikuti Tingkat: ${TIER_NAME[tier]}. Disesuaikan otomatis dari riwayat, paling cepat ${TIER_COOLDOWN_DAYS} hari sekali.`,
		holdAt: `${TIERS[tier].hold} soal`,
		scope: `${scopeTitle(bundle, settings.scope)}. Diubah dari tab Cakupan.`,
		diplomatEnabled: settings.specialEnabled,
		diplomatPerDay: String(SPECIAL_NEW_PER_DAY),
		timeLimit: `${TIMED_LIMIT_MS / 1000} detik`,
		data: {
			version: bundle.version,
			regions: String(bundle.regions.length),
			diplomats: String(bundle.specials.length)
		},
		params:
			since !== null
				? `Parameter pribadi aktif sejak ${shortDate(localDay(since, tz))}. Dikembalikan otomatis jika hasilnya memburuk.`
				: `Parameter bawaan. Parameter pribadi dibuat setelah ${OPTIMIZE_FIRST_REVIEWS} jawaban.`,
		retention: decimal(TARGET_RETENTION, 2),
		persisted,
		contact: "contact@terka.my.id"
	};
}
