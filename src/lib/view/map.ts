import type { MapProvince } from "@/components/ui/mastery-map";
import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import { scopeMastery } from "@/core/views/mastery";
import { provincesOf, uiGroup } from "./groups";

/** Every province in the data; a province without cards to learn has no percent. */
export function mapProvinces(state: AppState, bundle: Bundle): Record<string, MapProvince> {
	const result: Record<string, MapProvince> = {};
	for (const group of bundle.groups)
		for (const province of provincesOf(bundle, group.id)) {
			const mastery = scopeMastery(state, bundle, { level: "province", id: province.id });
			result[province.id] = {
				name: province.name,
				group: uiGroup(group.id),
				codes: province.codes,
				percent: mastery.percent,
				mastered: mastery.mature,
				total: mastery.counted
			};
		}
	return result;
}
