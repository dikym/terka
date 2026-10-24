import type { MapProvince } from "@/components/ui/mastery-map";
import { COVERAGE } from "./coverage";

// Provinces split off in 2022 have no study material yet.
const NO_MATERIAL = new Set([
	"papua-barat-daya",
	"papua-tengah",
	"papua-pegunungan",
	"papua-selatan"
]);

export const provinces: Record<string, MapProvince> = Object.fromEntries(
	COVERAGE.flatMap((group) =>
		group.provinces.map((province) => {
			const total = province.codes.length * 4;
			return [
				province.id,
				{
					name: province.name,
					group: group.id,
					codes: province.codes,
					percent: NO_MATERIAL.has(province.id) ? null : province.percent,
					mastered: Math.round((province.percent / 100) * total),
					total
				}
			];
		})
	)
);
