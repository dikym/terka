import type { MapProvince } from "@/components/ui/mastery-map";
import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import { scopeMastery } from "@/core/views/mastery";
import { provincesOf, uiGroup } from "./groups";
import { codeMastered, REGION_MODES } from "./stats";

/** Every province in the data, its progress percent and how many of its codes are mastered. */
export function mapProvinces(state: AppState, bundle: Bundle): Record<string, MapProvince> {
	const result: Record<string, MapProvince> = {};
	for (const group of bundle.groups)
		for (const province of provincesOf(bundle, group.id)) {
			const mastery = scopeMastery(state, bundle, { level: "province", id: province.id });
			const codes = bundle.regions.filter(
				(region) =>
					region.province === province.id && state.cards.has(`${region.id}::code2region`)
			);
			result[province.id] = {
				name: province.name,
				group: uiGroup(group.id),
				codes: province.codes,
				percent: mastery.percent,
				mastered: codes.filter((region) => codeMastered(state, region.id, REGION_MODES))
					.length,
				total: codes.length
			};
		}
	return result;
}
