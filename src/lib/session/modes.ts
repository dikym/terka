import { highMembers, type NameDictionary } from "@/core/answers/dictionary";
import type { IconName } from "@/components/ui/icon";
import type { Bundle } from "@/core/content/schema";
import type { RunKind } from "@/core/log/events";
import { inScope, NATIONAL, type Scope } from "@/core/questions/distractors";
import { streak } from "@/core/replay/streak";
import type { AppState } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import {
	ACTIVE,
	contentOf,
	isGroupA,
	prepare,
	type QueueItem,
	type SessionContext,
	type SessionSettings,
	todayOf
} from "@/core/session/context";
import { challengeQueue, focusedQueue, kilatQuestion, setrecallQueue } from "@/core/session/modes";
import { placementItems, type Stage } from "@/core/session/placement";
import { buildPreview, kilatPreview, type Preview as CorePreview } from "@/core/session/preview";
import { dailyQueue, specialQueue } from "@/core/session/queue";
import { buildQuestion } from "@/core/questions/build";
import { addDays } from "@/core/time/day";
import { CHALLENGE_SIZE, KILAT_ROUND_MS, TIER_ORDER } from "@/rules";
import { clock, durationLabel } from "../view/format";
import { scopeGroup, scopeTitle } from "../view/groups";
import { type SessionCard, toCard } from "./cards";
import { composition, infoNotes, type Preview, typeRows } from "./preview";

export type Mode =
	"hariIni" | "harian" | "kilat" | "terfokus" | "diplomat" | "sebutkan" | "penempatan";

const PARAMS: Record<string, Mode> = {
	harian: "harian",
	kilat: "kilat",
	terfokus: "terfokus",
	diplomat: "diplomat",
	sebutkan: "sebutkan",
	penempatan: "penempatan"
};

export const modeFromParam = (value: string | null): Mode =>
	value && Object.hasOwn(PARAMS, value) ? PARAMS[value] : "hariIni";

export type PlanInput = {
	state: AppState;
	bundle: Bundle;
	dictionary: NameDictionary;
	settings: SessionSettings;
	notes: ReadonlyMap<string, string>;
	ctx: SessionContext;
};
export type PlanParams = { scope: Scope | null; code: string | null };

export type Plan =
	| {
			kind: "ready";
			mode: Mode;
			/** Empty for Mode Kilat and the placement test: their questions follow the run id. */
			cards: SessionCard[];
			run: { kind: RunKind; scope: Scope };
			preview: Preview | null;
			held: boolean;
			estimatedMs: number | null;
	  }
	| {
			kind: "empty";
			mode: Mode;
			title: string;
			icon: IconName;
			message: string;
			detail?: string;
	  };

const RUN_KIND: Record<Mode, RunKind> = {
	hariIni: "daily",
	harian: "challenge",
	kilat: "kilat",
	terfokus: "focused",
	diplomat: "special",
	sebutkan: "setrecall",
	penempatan: "placement"
};

const TITLE: Record<Mode, string> = {
	hariIni: "Sesi hari ini",
	harian: "Tantangan Harian",
	kilat: "Mode Kilat",
	terfokus: "Latihan Terfokus",
	diplomat: "Kode diplomat",
	sebutkan: "Sebutkan sebanyak mungkin",
	penempatan: "Tes penempatan"
};

const ICON: Record<Mode, IconName> = {
	hariIni: "play",
	harian: "calendar-check",
	kilat: "zap",
	terfokus: "crosshair",
	diplomat: "flag",
	sebutkan: "play",
	penempatan: "play"
};

const NOTHING_LEARNED = "Belum ada materi yang bisa dilatih di wilayah ini.";
const NOTHING_DUE = "Tidak ada soal yang perlu diulang hari ini.";
const HELD = "Materi baru dijeda hari ini agar sesi tetap ringan.";

const empty = (mode: Mode, message: string, detail?: string): Plan => ({
	kind: "empty",
	mode,
	title: TITLE[mode],
	icon: ICON[mode],
	message,
	detail
});

function cardsOf(input: PlanInput, state: AppState, items: QueueItem[], mode: Mode, scope: Scope) {
	return items.map((item, index) => {
		const entry = effectiveCard(state, item.cardId)!;
		// Terfokus marks the answers that also move today's schedule.
		const counts = mode === "terfokus" && ACTIVE.has(entry.state) && entry.due <= input.ctx.now;
		const question = buildQuestion(entry, input.bundle, {
			context: item.context,
			format: item.format,
			drillPair: item.drillPair,
			scope,
			note: input.notes.get(contentOf(item.cardId)) ?? null
		});
		const card = toCard(question, item, entry, {
			bundle: input.bundle,
			dictionary: input.dictionary,
			notes: input.notes,
			mode,
			counts,
			scope
		});
		return { ...card, id: `${card.id}#${index}` };
	});
}

function previewFor(input: PlanInput, state: AppState, items: QueueItem[], held: boolean) {
	return buildPreview(state, input.bundle, items, input.settings, input.ctx, {
		held,
		lastInputMode: null,
		completedSessions: 0,
		revision: ""
	});
}

function levels(core: CorePreview): Preview["right"] {
	return { kind: "levels", values: [core.byLevel[1], core.byLevel[2], core.byLevel[3]] };
}

function notesOf(input: PlanInput, state: AppState, core: CorePreview, items: QueueItem[]) {
	const today = todayOf(input.ctx);
	const regions = new Map(input.bundle.regions.map((region) => [region.id, region]));
	const previous = state.tier.days.get(addDays(today, -1))?.tier ?? state.tier.current;
	const notes = infoNotes(core.info, {
		timed: core.questions.filter((q) => q.level === 3 && q.limit?.until === "first-input")
			.length,
		leech: core.questions.filter((q) => q.assisted).length,
		outside: items.filter((item) => {
			const region = regions.get(contentOf(item.cardId));
			return item.slot === "review" && region && !inScope(region, input.settings.scope);
		}).length,
		tier: {
			tier: state.tier.current,
			up: TIER_ORDER.indexOf(state.tier.current) > TIER_ORDER.indexOf(previous)
		}
	});
	return notes.length ? notes : undefined;
}

const scopeRow = (bundle: Bundle, scope: Scope): Preview["scope"] => ({
	group: scopeGroup(bundle, scope) ?? "national",
	label: scopeTitle(bundle, scope)
});

const duration = (core: CorePreview): Preview["aside"] => ({
	label: "Perkiraan durasi",
	icon: "clock",
	value: durationLabel(core.range)
});

function ready(
	mode: Mode,
	input: PlanInput,
	state: AppState,
	items: QueueItem[],
	scope: Scope,
	held: boolean,
	describe: (core: CorePreview, cards: SessionCard[]) => Preview
): Plan {
	const core = previewFor(input, state, items, held);
	const cards = cardsOf(input, state, items, mode, scope);
	return {
		kind: "ready",
		mode,
		cards,
		run: { kind: RUN_KIND[mode], scope: mode === "hariIni" ? input.settings.scope : scope },
		preview: describe(core, cards),
		held,
		estimatedMs: core.estimatedMs
	};
}

export function planSession(mode: Mode, input: PlanInput, params: PlanParams): Plan {
	const state = prepare(input.state, input.ctx);
	const { bundle, settings, ctx } = input;
	const today = todayOf(ctx);
	switch (mode) {
		case "hariIni": {
			const daily = dailyQueue(state, bundle, settings, ctx);
			if (!daily.items.length) {
				const next = cardsWhereActive(state).filter((due) => due > ctx.now);
				const detail = next.length
					? `Pengulangan berikutnya tersedia pukul ${clock(Math.min(...next), ctx.tz)}.`
					: undefined;
				return empty(mode, daily.held ? HELD : NOTHING_DUE, detail);
			}
			return ready(mode, input, state, daily.items, settings.scope, daily.held, (core) => ({
				icon: ICON[mode],
				title: TITLE[mode],
				scope: scopeRow(bundle, settings.scope),
				count: String(core.questions.length),
				unit: "soal",
				aside: duration(core),
				composition: composition(core.counts),
				types: typeRows(core.questions.map((question) => question.label)),
				right: levels(core),
				notes: notesOf(input, state, core, daily.items),
				start: "Mulai"
			}));
		}
		case "harian": {
			const queue = challengeQueue(state, ctx);
			if (!Array.isArray(queue))
				return empty(
					mode,
					queue.unavailable === "done" ? "Sudah selesai untuk hari ini" : NOTHING_LEARNED
				);
			return ready(mode, input, state, queue, NATIONAL, false, (core) => ({
				icon: ICON[mode],
				title: TITLE[mode],
				facts: [
					["calendar-days", "Sekali sehari"],
					["layers", "Lintas Cakupan"]
				],
				count: String(Math.min(core.questions.length, CHALLENGE_SIZE)),
				unit: "soal",
				aside: duration(core),
				types: typeRows(core.questions.map((question) => question.label)),
				right: {
					kind: "streak",
					days: streak(state.challengeDays, today),
					note: "Selesaikan hari ini untuk mencatat Hari Beruntun. Jawaban tidak mengubah jadwal belajar."
				},
				start: "Mulai tantangan"
			}));
		}
		case "kilat": {
			const scope = params.scope ?? settings.scope;
			if (!kilatQuestion(state, bundle, scope, "probe", 0))
				return empty(mode, NOTHING_LEARNED);
			const { record } = kilatPreview(state, scope);
			const label = scopeTitle(bundle, scope);
			return {
				kind: "ready",
				mode,
				cards: [],
				run: { kind: "kilat", scope },
				held: false,
				estimatedMs: KILAT_ROUND_MS,
				preview: {
					icon: ICON[mode],
					title: TITLE[mode],
					scope: scopeRow(bundle, scope),
					count: String(KILAT_ROUND_MS / 1000),
					unit: "detik",
					aside: {
						label: "Rekor wilayah ini",
						icon: "trophy",
						value:
							record === null
								? "Belum ada rekor untuk wilayah ini."
								: `Rekor terbaik di ${label}: ${record}`
					},
					types: [
						["Tebak daerah", "acak"],
						["Benar atau salah", "acak"],
						["Mana yang bukan", "acak"]
					],
					right: {
						kind: "rules",
						rows: [
							["Jadwal belajar", "tidak berubah"],
							["Batalkan jawaban", "tidak tersedia"],
							["Rekor dicatat", "per wilayah"]
						]
					},
					start: "Mulai"
				}
			};
		}
		case "terfokus": {
			const scope = params.scope ?? settings.scope;
			const items = focusedQueue(state, bundle, scope, ctx);
			if (!items.length) return empty(mode, NOTHING_LEARNED);
			return ready(mode, input, state, items, scope, false, (core, cards) => {
				const counted = cards.filter((card) => card.notice).length;
				return {
					icon: ICON[mode],
					title: TITLE[mode],
					scope: scopeRow(bundle, scope),
					description:
						"Latihan tambahan. Hanya soal yang sudah waktunya diulang yang dapat memengaruhi jadwal.",
					count: String(cards.length),
					unit: "soal",
					aside: duration(core),
					composition: (
						[
							["Dihitung untuk jadwal", counted, "bg-ink-1000"],
							["Latihan tambahan", cards.length - counted, "bg-ink-200"]
						] as [string, number, string][]
					).filter(([, value]) => value > 0),
					types: typeRows(core.questions.map((question) => question.label)),
					right: levels(core),
					notes: notesOf(input, state, core, items),
					start: "Mulai"
				};
			});
		}
		case "diplomat": {
			const queue = specialQueue(state, bundle, settings, ctx);
			if (!queue.items.length)
				return empty(
					mode,
					queue.held
						? "Materi baru Kode diplomat dijeda hari ini agar sesi tetap ringan."
						: settings.specialEnabled
							? NOTHING_DUE
							: "Latihan Kode diplomat belum aktif. Aktifkan di Setelan untuk mulai."
				);
			return ready(mode, input, state, queue.items, NATIONAL, queue.held, (core) => ({
				icon: ICON[mode],
				title: TITLE[mode],
				facts: [["calendar-days", "Jadwal terpisah dari latihan wilayah"]],
				count: String(core.questions.length),
				unit: "soal",
				aside: duration(core),
				composition: composition(core.counts),
				types: typeRows(core.questions.map((question) => question.label)),
				right: levels(core),
				notes: [["info", null, "Nomor urut di belakang kode negara tidak dilatih."]],
				start: "Mulai"
			}));
		}
		case "sebutkan": {
			const region = bundle.regions.find((item) => item.code === params.code);
			if (!region) return empty(mode, "Pilih kode dari halaman Statistik untuk mulai.");
			const queue = setrecallQueue(state, region.id, ctx);
			if (!Array.isArray(queue)) return empty(mode, SETRECALL_UNAVAILABLE[queue.unavailable]);
			const areas = highMembers(bundle, region).length;
			return ready(mode, input, state, queue, NATIONAL, false, (core) => ({
				icon: ICON[mode],
				title: TITLE[mode],
				facts: [["layers", "Satu kode per sesi, di luar sesi harian"]],
				count: "1",
				unit: "kode",
				aside: duration(core),
				types: [[`Sebutkan daerah ${region.code}`, `${areas} kab/kota`]],
				right: levels(core),
				start: "Mulai"
			}));
		}
		case "penempatan":
			return {
				kind: "ready",
				mode,
				cards: [],
				run: { kind: "placement", scope: NATIONAL },
				preview: null,
				held: false,
				estimatedMs: null
			};
	}
}

const SETRECALL_UNAVAILABLE = {
	locked: "Kode ini belum bisa disebutkan. Latihan ini terbuka setelah kodenya lama dikuasai.",
	suspended: "Kode ini dinonaktifkan sementara. Tinjau di halaman statistik.",
	quota: "Batas materi baru hari ini sudah tercapai. Coba lagi besok.",
	held: HELD,
	related: "Kode ini sudah diperkenalkan hari ini. Coba lagi besok."
};

const cardsWhereActive = (state: AppState) =>
	[...state.cards.values()]
		.filter((card) => ACTIVE.has(card.state) && isGroupA(card.cardId))
		.map((card) => card.due);

/** Mode Kilat questions `from`..`from + count`, seeded by the run. */
export function kilatCards(
	input: PlanInput,
	scope: Scope,
	runId: string,
	from: number,
	count: number
): SessionCard[] {
	const state = prepare(input.state, input.ctx);
	const items: QueueItem[] = [];
	for (let index = from; index < from + count; index++) {
		const item = kilatQuestion(state, input.bundle, scope, runId, index);
		if (item) items.push(item);
	}
	return cardsOf(input, state, items, "kilat", scope).map((card, offset) => ({
		...card,
		id: `${card.question.cardId}#${from + offset}`
	}));
}

/** One stage of the placement test, seeded by the run. */
export function placementCards(input: PlanInput, runId: string, stage: Stage): SessionCard[] {
	const state = prepare(input.state, input.ctx);
	return cardsOf(
		input,
		state,
		placementItems(input.bundle, runId, stage),
		"penempatan",
		NATIONAL
	);
}
