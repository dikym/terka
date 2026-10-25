import type { GroupId } from "@/components/ui/groups";
import type { Bundle } from "@/core/content/schema";
import { inScope, NATIONAL, type Scope } from "@/core/questions/distractors";
import type { AppState } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import { contentOf, modeOf } from "@/core/session/context";
import { scopeMastery } from "@/core/views/mastery";
import { provincesOf, uiGroup } from "./groups";

export type Province = { id: string; name: string; codes: string[]; percent: number };

export type CoverageGroup = {
	id: GroupId;
	bundleId: string;
	codes: number;
	percent: number;
	newAvailable: number;
	provinces: Province[];
};

export type Coverage = {
	national: { provinces: number; codes: number; percent: number; newAvailable: number };
	groups: CoverageGroup[];
};

/** New Tebak daerah cards per code: what "materi baru tersedia" counts. */
function newCodes(state: AppState) {
	const codes = new Set<string>();
	for (const cardId of state.cards.keys())
		if (modeOf(cardId) === "code2region" && effectiveCard(state, cardId)?.state === "new")
			codes.add(contentOf(cardId));
	return codes;
}

export function coverageView(state: AppState, bundle: Bundle): Coverage {
	const waiting = newCodes(state);
	const percent = (scope: Scope) => scopeMastery(state, bundle, scope).percent ?? 0;
	const newIn = (scope: Scope) =>
		bundle.regions.filter((region) => waiting.has(region.id) && inScope(region, scope)).length;
	const groups = bundle.groups.map((group) => {
		const scope: Scope = { level: "group", id: group.id };
		return {
			id: uiGroup(group.id),
			bundleId: group.id,
			codes: bundle.regions.filter((region) => region.group === group.id).length,
			percent: percent(scope),
			newAvailable: newIn(scope),
			provinces: provincesOf(bundle, group.id).map((province) => ({
				...province,
				percent: percent({ level: "province", id: province.id })
			}))
		};
	});
	return {
		national: {
			provinces: new Set(bundle.regions.map((region) => region.province)).size,
			codes: bundle.regions.length,
			percent: percent(NATIONAL),
			newAvailable: newIn(NATIONAL)
		},
		groups
	};
}
