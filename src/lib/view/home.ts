import type { GroupId } from "@/components/ui/groups";
import type { Bundle } from "@/core/content/schema";
import { inScope } from "@/core/questions/distractors";
import { streak } from "@/core/replay/streak";
import type { AppState } from "@/core/replay/state";
import {
	cardsWhere,
	contentOf,
	modeOf,
	prepare,
	type SessionContext,
	type SessionSettings,
	todayOf
} from "@/core/session/context";
import { buildPreview } from "@/core/session/preview";
import { dailyQueue } from "@/core/session/queue";
import { addDays, dayStart } from "@/core/time/day";
import { homeSummary, type HomeSummary } from "@/core/views/home";
import { scopeMastery } from "@/core/views/mastery";
import { STREAK_WINDOW_DAYS, TIERS } from "@/rules";
import { dateLabel, durationLabel, weekdayShort } from "./format";
import { provincesOf, scopeGroup, scopeTitle, uiGroup } from "./groups";

export type DayMark = { day: string; state: "done" | "tolerance" | "missed" | "today" };

export type Home = {
	summary: HomeSummary;
	dateLabel: string;
	syncLabel: string;
	duration: string;
	note: string | null;
	reviewsOutsideScope: number;
	newLimit: number;
	pairs: { a: string; b: string; group: GroupId }[];
	scope: {
		group: GroupId | null;
		title: string;
		rows: { name: string; codes: string[]; percent: number }[];
		mastered: string;
		newInScope: string;
		newOutside: string;
	};
	week: DayMark[];
	tolerance: string;
	challengeDone: boolean;
	challengeResetAt: number;
};

// A missed day is forgiven when the count would carry on had the next day been played.
function forgiven(days: ReadonlySet<string>, day: string): boolean {
	const before = streak(days, day);
	if (before === 0) return false;
	const next = addDays(day, 1);
	return streak(new Set([...days, next]), next) > before;
}

function weekMarks(days: ReadonlySet<string>, today: string): DayMark[] {
	return Array.from({ length: 7 }, (_, index) => {
		const day = addDays(today, index - 6);
		const label = weekdayShort(day);
		if (days.has(day)) return { day: label, state: "done" };
		if (day === today) return { day: label, state: "today" };
		return { day: label, state: forgiven(days, day) ? "tolerance" : "missed" };
	});
}

function toleranceUsed(days: ReadonlySet<string>, today: string): number {
	let used = 0;
	for (let back = 1; back < STREAK_WINDOW_DAYS; back++) {
		const day = addDays(today, -back);
		if (!days.has(day) && forgiven(days, day)) used++;
	}
	return used;
}

function scopeRows(state: AppState, bundle: Bundle, settings: SessionSettings) {
	const { scope } = settings;
	const percent = (target: Parameters<typeof scopeMastery>[2]) =>
		scopeMastery(state, bundle, target).percent ?? 0;
	if (scope.level === "national")
		return bundle.groups.map((group) => ({
			name: group.name,
			codes: [],
			percent: percent({ level: "group", id: group.id })
		}));
	const groupId =
		scope.level === "group"
			? scope.id
			: bundle.regions.find((region) => region.province === scope.id)?.group;
	return provincesOf(bundle, groupId ?? "")
		.filter((province) => scope.level === "group" || province.id === scope.id)
		.map((province) => ({
			name: province.name,
			codes: province.codes,
			percent: percent({ level: "province", id: province.id })
		}));
}

function flaggedPairs(state: AppState, bundle: Bundle) {
	const codes = new Map(bundle.regions.map((region) => [region.id, region]));
	const seen = new Set<string>();
	const pairs: Home["pairs"] = [];
	for (const [key, pair] of state.pairs) {
		if (!pair.flagged) continue;
		const [from, to] = key.split(">");
		const id = [from, to].sort().join(">");
		const a = codes.get(from);
		const b = codes.get(to);
		if (seen.has(id) || !a || !b) continue;
		seen.add(id);
		pairs.push({ a: a.code, b: b.code, group: uiGroup(a.group) });
	}
	return pairs;
}

function note(summary: HomeSummary): string | null {
	if (summary.held) return "Materi baru dijeda hari ini agar sesi tetap ringan.";
	if (summary.due === 0 && summary.allIntroduced)
		return "Semua materi di wilayah ini sudah diperkenalkan.";
	if (summary.due === 0) return "Tidak ada soal yang perlu diulang hari ini.";
	return null;
}

export function homeView(
	input: AppState,
	bundle: Bundle,
	settings: SessionSettings,
	ctx: SessionContext,
	syncLabel: string
): Home {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const summary = homeSummary(state, bundle, settings, ctx);
	const daily = dailyQueue(state, bundle, settings, ctx);
	const preview = buildPreview(state, bundle, daily.items, settings, ctx, {
		held: daily.held,
		lastInputMode: null,
		completedSessions: 0,
		revision: ""
	});
	const regions = new Map(bundle.regions.map((region) => [region.id, region]));
	const outside = daily.items.filter((item) => {
		const region = regions.get(contentOf(item.cardId));
		return item.slot === "review" && region && !inScope(region, settings.scope);
	}).length;
	const waiting = cardsWhere(
		state,
		(cardId) => modeOf(cardId) === "code2region" && state.cards.get(cardId)?.state === "new"
	);
	const inside = waiting.filter((card) => {
		const region = regions.get(contentOf(card.cardId));
		return region && inScope(region, settings.scope);
	}).length;
	const used = toleranceUsed(state.challengeDays, today);
	return {
		summary,
		dateLabel: dateLabel(ctx.now, ctx.tz),
		syncLabel,
		duration: daily.items.length ? durationLabel(preview.range) : "",
		note: note(summary),
		reviewsOutsideScope: outside,
		newLimit: TIERS[state.tier.current].newPerDay,
		pairs: flaggedPairs(state, bundle),
		scope: {
			group: scopeGroup(bundle, settings.scope),
			title: scopeTitle(bundle, settings.scope),
			rows: scopeRows(state, bundle, settings),
			mastered: `${scopeMastery(state, bundle, settings.scope).percent ?? 0}%`,
			newInScope: String(inside),
			newOutside: String(waiting.length - inside)
		},
		week: weekMarks(state.challengeDays, today),
		tolerance: `Toleransi terpakai ${Math.min(used, 1)} dari 1 dalam ${STREAK_WINDOW_DAYS} hari.`,
		challengeDone: summary.challenge === "done",
		challengeResetAt: dayStart(addDays(today, 1), ctx.tz)
	};
}
