import { GROUP_IDS, type GroupId } from "@/components/ui/groups";
import { provinceName } from "@/core/answers/dictionary";
import { groupName } from "@/core/content/names";
import type { Bundle } from "@/core/content/schema";
import type { Scope } from "@/core/questions/distractors";

// The design names Bali & Nusa Tenggara "balinusra"; every other group id is the same.
export function uiGroup(id: string): GroupId {
	if (id === "bali-nusa-tenggara") return "balinusra";
	return (GROUP_IDS as readonly string[]).includes(id) ? (id as GroupId) : "papua";
}

export const bundleGroup = (id: GroupId) => (id === "balinusra" ? "bali-nusa-tenggara" : id);

export function scopeTitle(bundle: Bundle, scope: Scope): string {
	if (scope.level === "national") return "Seluruh Indonesia";
	if (scope.level === "group") return `Kawasan ${groupName(bundle, scope.id)}`;
	return provinceName(scope.id);
}

/** The colour of a scope: its group, or null for the whole country. */
export function scopeGroup(bundle: Bundle, scope: Scope): GroupId | null {
	if (scope.level === "national") return null;
	if (scope.level === "group") return uiGroup(scope.id);
	const region = bundle.regions.find((item) => item.province === scope.id);
	return region ? uiGroup(region.group) : null;
}

export const regionGroup = (bundle: Bundle, regionId: string): GroupId =>
	uiGroup(bundle.regions.find((region) => region.id === regionId)?.group ?? "");

/** Provinces of a group in data order, with their front codes. */
export function provincesOf(bundle: Bundle, groupId: string) {
	const provinces = new Map<string, { id: string; name: string; codes: string[] }>();
	for (const region of bundle.regions) {
		if (region.group !== groupId) continue;
		const entry = provinces.get(region.province) ?? {
			id: region.province,
			name: provinceName(region.province),
			codes: []
		};
		entry.codes.push(region.code);
		provinces.set(region.province, entry);
	}
	return [...provinces.values()];
}

export const parseScope = (value: string | null): Scope | null => {
	const match = value?.match(/^(group|province):([a-z0-9-]{1,32})$/);
	return match ? { level: match[1] as "group" | "province", id: match[2] } : null;
};

export const scopeParam = (scope: Scope) =>
	scope.level === "national" ? null : `${scope.level}:${scope.id}`;
