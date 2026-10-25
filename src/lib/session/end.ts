import type { GroupId } from "@/components/ui/groups";
import { groupName } from "@/core/content/names";
import type { Bundle, Fact } from "@/core/content/schema";
import type { ReviewLog } from "@/core/log/events";
import type { Scope } from "@/core/questions/distractors";
import { streak } from "@/core/replay/streak";
import type { AppState } from "@/core/replay/state";
import { sessionSummary } from "@/core/views/summary";
import { decimal } from "../view/format";
import { scopeTitle, uiGroup } from "../view/groups";
import type { Mode } from "./modes";

export type FactCardView = {
	label: "Terverifikasi" | "Diperdebatkan" | "Mitos";
	text: string;
	code: { code: string; group: GroupId } | null;
	source: string | null;
};

export type EndView = {
	mode: Mode;
	accuracy: number | null;
	latency: string | null;
	answered: number;
	correct: number;
	mastery: { delta: string; group: GroupId; name: string } | null;
	pair: { a: string; b: string; group: GroupId } | null;
	held: boolean;
	remainingDue: number;
	streak: number;
	kilatLine: string | null;
	kilatNew: boolean;
	fact: FactCardView | null;
	loginPrompt: boolean;
};

export type EndInput = {
	mode: Mode;
	before: AppState;
	after: AppState;
	answers: ReviewLog[];
	bundle: Bundle;
	held: boolean;
	fact: Fact | null;
	/** The score of this round and the record before it. */
	kilat: { score: number; record: number | null; scope: Scope } | null;
	loginPrompt: boolean;
	today: string;
	remainingDue?: number;
};

const LABEL = { terverifikasi: "Terverifikasi", diperdebatkan: "Diperdebatkan", mitos: "Mitos" };

export function factCard(bundle: Bundle, fact: Fact): FactCardView {
	const region = bundle.regions.find((item) => item.facts.includes(fact.id));
	const source = bundle.sources.find((item) => item.id === fact.source[0]);
	return {
		label: LABEL[fact.historyLabel] as FactCardView["label"],
		text: fact.text,
		code: region ? { code: region.code, group: uiGroup(region.group) } : null,
		source: source ? `${source.title}, ${source.publisher}` : null
	};
}

function kilatLine(bundle: Bundle, kilat: NonNullable<EndInput["kilat"]>) {
	const label = scopeTitle(bundle, kilat.scope);
	if (kilat.record === null && kilat.score === 0)
		return { line: "Belum ada rekor untuk wilayah ini.", isNew: false };
	if (kilat.record === null || kilat.score > kilat.record)
		return { line: `Rekor baru di ${label}: ${kilat.score}`, isNew: true };
	return { line: `Rekor terbaik di ${label}: ${kilat.record}`, isNew: false };
}

export function endView(input: EndInput): EndView {
	const { bundle } = input;
	const summary = sessionSummary(input.before, input.after, input.answers, bundle);
	const change = summary.masteryChanges[0];
	const [from, to] = summary.newPairs[0]?.split(">") ?? [];
	const code = (id: string) => bundle.regions.find((region) => region.id === id);
	const pairA = from ? code(from) : undefined;
	const pairB = to ? code(to) : undefined;
	const kilat = input.kilat ? kilatLine(bundle, input.kilat) : null;
	const delta = change ? (change.after ?? 0) - (change.before ?? 0) : 0;
	return {
		mode: input.mode,
		accuracy: summary.accuracy,
		latency: summary.meanLatencyMs === null ? null : decimal(summary.meanLatencyMs / 1000),
		answered: summary.answered,
		correct: summary.correct,
		mastery: change
			? {
					delta: `${delta >= 0 ? "+" : ""}${delta}%`,
					group: uiGroup(change.groupId),
					name: groupName(bundle, change.groupId)
				}
			: null,
		pair: pairA && pairB ? { a: pairA.code, b: pairB.code, group: uiGroup(pairA.group) } : null,
		held: input.held,
		remainingDue: input.remainingDue ?? 0,
		streak: streak(input.after.challengeDays, input.today),
		kilatLine: kilat?.line ?? null,
		kilatNew: kilat?.isNew ?? false,
		fact: input.fact ? factCard(bundle, input.fact) : null,
		loginPrompt: input.loginPrompt
	};
}
