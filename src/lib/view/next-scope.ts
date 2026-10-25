import type { Bundle } from "@/core/content/schema";
import type { Scope } from "@/core/questions/distractors";
import type { AppState } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import { provincesOf } from "./groups";

// Once a scope has nothing left to introduce, the next one in data order that does, wrapping around.
export function nextScope(state: AppState, bundle: Bundle, scope: Scope): Scope | null {
	if (scope.level === "national") return null;
	const fresh = new Set(
		bundle.regions
			.filter((region) => effectiveCard(state, `${region.id}::code2region`)?.state === "new")
			.map((region) => region.id)
	);
	const open = (ids: string[]) => ids.some((id) => fresh.has(id));
	const regionsOf = (key: "group" | "province", id: string) =>
		bundle.regions.filter((region) => region[key] === id).map((region) => region.id);
	if (open(regionsOf(scope.level, scope.id))) return null;

	const groups = bundle.groups.map((group) => group.id);
	const current =
		scope.level === "group"
			? scope.id
			: bundle.regions.find((region) => region.province === scope.id)?.group;
	const start = groups.indexOf(current ?? "");
	if (start === -1) return null;
	const order = [...groups.slice(start), ...groups.slice(0, start)];

	if (scope.level === "group") {
		const next = order.slice(1).find((id) => open(regionsOf("group", id)));
		return next ? { level: "group", id: next } : null;
	}
	const provinces = order.flatMap((id) => provincesOf(bundle, id).map((province) => province.id));
	const from = provinces.indexOf(scope.id);
	const next = [...provinces.slice(from + 1), ...provinces.slice(0, from)].find((id) =>
		open(regionsOf("province", id))
	);
	return next ? { level: "province", id: next } : null;
}
