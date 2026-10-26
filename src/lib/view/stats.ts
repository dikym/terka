import type { GroupId } from "@/components/ui/groups";
import { highMembers } from "@/core/answers/dictionary";
import type { Bundle, Region } from "@/core/content/schema";
import { LABELS } from "@/core/questions/question";
import { NATIONAL } from "@/core/questions/distractors";
import type { AppState, CardEntry } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import { contentOf, modeOf, prepare, type SessionContext, todayOf } from "@/core/session/context";
import { scopeMastery } from "@/core/views/mastery";
import { forecast, hardCards, sightingCounts, weakestCards } from "@/core/views/stats";
import { LEECH_LAPSES, TIERS } from "@/rules";
import { dayMonth, weekday, weekdayShort } from "./format";
import { provincesOf, uiGroup } from "./groups";

export type CodeStatus = "learning" | "leech" | "suspended";

export const STATUS_LABEL: Record<CodeStatus, string> = {
	learning: "Sedang Dipelajari",
	leech: "Sulit Dikuasai",
	suspended: "Dinonaktifkan"
};

export type Stats = {
	national: { percent: string; codes: string; groups: string };
	levels: { level: string; name: string; passed: string; percent: number }[];
	weakest: {
		code: string;
		group: GroupId;
		areas: string;
		/** Every area, for the tooltip on the shortened `areas`. */
		allAreas: string;
		status: CodeStatus;
		right: number;
		of: number;
	}[];
	forecast: { title: string; threshold: number; days: [string, string, number][] };
	byGroup: { group: GroupId; name: string; levels: string[] }[];
	hard: { code: string; group: GroupId; status: CodeStatus }[];
	nameAll: { code: string; group: GroupId; title: string; areas: string; wait: string | null }[];
	/** `started`: some diplomat code was introduced, so the card has something to report. */
	diplomat: { mastered: number; total: number; started: boolean };
	seen: { code: string; group: GroupId; count: number }[];
	account: { email: string | null; sync: string; export: string };
};

export const REGION_MODES = new Set(["code2region", "region2code", "setrecall"]);
const LEFT_OUT = new Set(["locked", "suspended"]);
const UNSTARTED = new Set(["locked", "new"]);
const LEVELS = [
	["Level 1", "Kenali"],
	["Level 2", "Ingat"],
	["Level 3", "Kuasai"]
] as const;

const regionsById = (bundle: Bundle) =>
	new Map(bundle.regions.map((region) => [region.id, region]));

/** "Kota Medan, Kota Binjai, dan 3 lainnya". */
/** The first names and a count of the rest; "dan 1 lainnya" would be no shorter than the name. */
export function listSummary(names: string[], shown: number): string {
	if (names.length <= shown + 1) return names.join(", ");
	return `${names.slice(0, shown).join(", ")}, dan ${names.length - shown} lainnya`;
}

const areaNames = (bundle: Bundle, region: Region) =>
	highMembers(bundle, region).map((area) =>
		area.type === "kota" ? `Kota ${area.name}` : area.name
	);

export function areaSummary(bundle: Bundle, region: Region, shown = 2): string {
	return listSummary(areaNames(bundle, region), shown);
}

const statusOf = (card: CardEntry): CodeStatus =>
	card.state === "suspended" ? "suspended" : card.lapses >= LEECH_LAPSES ? "leech" : "learning";

/** A code is Dikuasai when every card it has, apart from locked or suspended ones, is mature. */
export function codeMastered(
	state: AppState,
	contentId: string,
	modes: ReadonlySet<string>
): boolean {
	let counted = 0;
	for (const cardId of state.cards.keys()) {
		if (contentOf(cardId) !== contentId || !modes.has(modeOf(cardId))) continue;
		const card = effectiveCard(state, cardId)!;
		if (LEFT_OUT.has(card.state)) continue;
		if (card.state !== "mature") return false;
		counted++;
	}
	return counted > 0;
}

function learnedShares(cards: CardEntry[]) {
	const learned = cards.filter((card) => !LEFT_OUT.has(card.state) && card.state !== "new");
	return [0, 1, 2].map((index) => {
		const passed = learned.filter((card) => card.passedLevels[index]).length;
		return {
			passed,
			percent: learned.length ? Math.round((passed / learned.length) * 100) : 0
		};
	});
}

const regionCards = (state: AppState, keep: (region: string) => boolean) =>
	[...state.cards.keys()]
		.filter((cardId) => REGION_MODES.has(modeOf(cardId)) && keep(contentOf(cardId)))
		.map((cardId) => effectiveCard(state, cardId)!);

function forecastView(state: AppState, ctx: SessionContext): Stats["forecast"] {
	const days = forecast(state, ctx);
	const peak = days.reduce((best, day) => (day.due > best.due ? day : best), days[0]);
	return {
		title: peak.due
			? `Puncak ${peak.due} soal pada ${weekday(peak.localDay)}, ${dayMonth(peak.localDay)}`
			: "Belum ada soal terjadwal",
		threshold: TIERS[state.tier.current].hold,
		days: days.map((day, index) =>
			index === 0
				? ["Hari", "ini", day.due]
				: [weekdayShort(day.localDay), day.localDay.slice(8).replace(/^0/, ""), day.due]
		)
	};
}

export function statsView(
	input: AppState,
	bundle: Bundle,
	ctx: SessionContext,
	account: Stats["account"]
): Stats {
	const state = prepare(input, ctx);
	const today = todayOf(ctx);
	const regions = regionsById(bundle);
	const trainable = bundle.regions.filter((region) =>
		state.cards.has(`${region.id}::code2region`)
	);
	const masteredCodes = trainable.filter((region) =>
		codeMastered(state, region.id, REGION_MODES)
	).length;
	const masteredGroups = bundle.groups.filter(
		(group) => scopeMastery(state, bundle, { level: "group", id: group.id }).mastered
	).length;
	const shares = learnedShares(regionCards(state, () => true));

	const weakest: Stats["weakest"] = [];
	for (const row of weakestCards(state)) {
		const region = regions.get(contentOf(row.cardId));
		if (!region || weakest.some((item) => item.code === region.code)) continue;
		weakest.push({
			code: region.code,
			group: uiGroup(region.group),
			areas: areaSummary(bundle, region),
			allAreas: areaNames(bundle, region).join(", "),
			status: statusOf(effectiveCard(state, row.cardId)!),
			right: row.answered - row.wrong,
			of: row.answered
		});
	}

	const hard: Stats["hard"] = [];
	for (const row of hardCards(state)) {
		const region = regions.get(contentOf(row.cardId));
		if (!region || hard.some((item) => item.code === region.code)) continue;
		hard.push({
			code: region.code,
			group: uiGroup(region.group),
			status: row.suspended ? "suspended" : "leech"
		});
	}

	const nameAll: Stats["nameAll"] = [];
	for (const region of bundle.regions) {
		const card = effectiveCard(state, `${region.id}::setrecall`);
		if (!card || LEFT_OUT.has(card.state)) continue;
		const days = Math.ceil((card.due - ctx.now) / 86_400_000);
		nameAll.push({
			code: region.code,
			group: uiGroup(region.group),
			title: `Sebutkan daerah ${region.code}`,
			areas: `${highMembers(bundle, region).length} kab/kota`,
			wait: card.state !== "new" && days > 0 ? `${days} hari lagi` : null
		});
	}

	const specials = bundle.specials.filter((special) =>
		state.cards.has(`${special.id}::special2holder`)
	);
	const seen = [...sightingCounts(state, today)]
		.map(([id, count]) => ({ region: regions.get(id), count }))
		.filter((row): row is { region: Region; count: number } => row.region !== undefined)
		.sort((a, b) => b.count - a.count)
		.slice(0, 5)
		.map(({ region, count }) => ({ code: region.code, group: uiGroup(region.group), count }));

	return {
		national: {
			percent: `${scopeMastery(state, bundle, NATIONAL).percent ?? 0}%`,
			codes: `${masteredCodes} dari ${trainable.length}`,
			groups: `${masteredGroups} dari ${bundle.groups.length}`
		},
		levels: LEVELS.map(([level, name], index) => ({
			level,
			name,
			passed: `${shares[index].passed} soal lolos`,
			percent: shares[index].percent
		})),
		weakest,
		forecast: forecastView(state, ctx),
		byGroup: bundle.groups.map((group) => {
			const codes = new Set(
				bundle.regions.filter((region) => region.group === group.id).map((r) => r.id)
			);
			return {
				group: uiGroup(group.id),
				name: group.name,
				levels: learnedShares(regionCards(state, (id) => codes.has(id))).map(
					(share) => `${share.percent}%`
				)
			};
		}),
		hard,
		nameAll,
		diplomat: {
			mastered: specials.filter((special) =>
				codeMastered(state, special.id, new Set(["special2holder", "holder2special"]))
			).length,
			total: specials.length,
			started: specials.some((special) =>
				["special2holder", "holder2special"].some((mode) => {
					const card = effectiveCard(state, `${special.id}::${mode}`);
					return card !== undefined && !UNSTARTED.has(card.state);
				})
			)
		},
		seen,
		account
	};
}

export type MasteryRow = {
	group: GroupId;
	name: string;
	percent: number;
	figures: string[][];
	note?: { tone: string; text: string };
};

/** One row per group under the map: a short read of its provinces. */
export function masteryByGroup(state: AppState, bundle: Bundle): MasteryRow[] {
	return bundle.groups.map((group) => {
		const mastery = scopeMastery(state, bundle, { level: "group", id: group.id });
		const provinces = provincesOf(bundle, group.id).map((province) => ({
			name: province.name,
			percent: scopeMastery(state, bundle, { level: "province", id: province.id }).percent
		}));
		const withMaterial = provinces.filter((province) => province.percent !== null);
		const started = withMaterial.filter((province) => province.percent! > 0);
		const best = [...started].sort((a, b) => b.percent! - a.percent!)[0];
		const figures: string[][] =
			provinces.length <= 3
				? provinces.map((province) => [`${province.percent ?? 0}%`, province.name])
				: [
						...(best ? [[`${best.percent}%`, `tertinggi ${best.name}`]] : []),
						[`${withMaterial.length - started.length} provinsi`, "belum mulai"]
					];
		const codes = new Set(
			bundle.regions.filter((region) => region.group === group.id).map((r) => r.id)
		);
		const pair = [...state.pairs].find(
			([key, value]) => value.flagged && key.split(">").some((id) => codes.has(id))
		);
		const code = (id: string) => bundle.regions.find((region) => region.id === id)?.code ?? id;
		const unverified = bundle.regions.some(
			(region) => region.group === group.id && region.confidence !== "high"
		);
		const note = pair
			? {
					tone: "text-stop-700",
					text: `Sering tertukar: ${pair[0].split(">").map(code).join(" dan ")}`
				}
			: mastery.mastered
				? { tone: "text-go-700", text: "Kawasan dikuasai" }
				: unverified
					? { tone: "text-caution-700", text: "Data belum terverifikasi penuh" }
					: undefined;
		return {
			group: uiGroup(group.id),
			name: group.name,
			percent: mastery.percent ?? 0,
			figures,
			note
		};
	});
}

export type HardCard = {
	cardId: string;
	contentId: string;
	code: string;
	group: GroupId;
	form: string;
	place: string;
	misses: number;
	status: "leech" | "suspended";
	areas: string[];
	more: number;
};

const FORM_LABEL: Record<string, string> = {
	code2region: LABELS.guessArea,
	region2code: LABELS.guessCode,
	setrecall: LABELS.set,
	special2holder: LABELS.diplomat,
	holder2special: LABELS.diplomat
};

/** Cards at or past the leech mark, one row per card, for Sulit Dikuasai. */
export function hardCardList(state: AppState, bundle: Bundle): HardCard[] {
	const regions = regionsById(bundle);
	return hardCards(state).flatMap((row) => {
		const contentId = contentOf(row.cardId);
		const region = regions.get(contentId);
		const special = bundle.specials.find((item) => item.id === contentId);
		if (!region && !special) return [];
		const areas = region
			? highMembers(bundle, region).map((area) =>
					area.type === "kota" ? `Kota ${area.name}` : `Kabupaten ${area.name}`
				)
			: [special!.holder];
		return [
			{
				cardId: row.cardId,
				contentId,
				code: region?.code ?? `CD ${special!.number}`,
				group: region ? uiGroup(region.group) : "jawa",
				form: FORM_LABEL[modeOf(row.cardId)] ?? LABELS.guessArea,
				place: region?.region ?? special!.holder,
				misses: row.lapses,
				status: row.suspended ? ("suspended" as const) : ("leech" as const),
				areas: areas.slice(0, 4),
				more: Math.max(0, areas.length - 4)
			}
		];
	});
}
