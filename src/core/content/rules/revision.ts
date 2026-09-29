import { error, type ContentMessage } from "../messages";
import type { Bundle } from "../schema";

// Everything a content revision covers: the bundle minus its release metadata (and the retired sourceRevision).
const payload = (bundle: Record<string, unknown>) =>
	JSON.stringify(
		Object.fromEntries(
			Object.entries(bundle).filter(
				([key]) =>
					!["version", "contentRev", "contentHistory", "sourceRevision"].includes(key)
			)
		)
	);

// Ids across the record collections a retirement can drop: regions, areas, facts and specials.
const recordIds = (bundle: Record<string, unknown>) => {
	const ids = new Set<string>();
	for (const key of ["regions", "areas", "facts", "specials"]) {
		const list = bundle[key];
		if (Array.isArray(list))
			for (const item of list)
				if (item && typeof item === "object" && "id" in item) ids.add(String(item.id));
	}
	return ids;
};

// TRD 4.1 "Versi konten": contentRev rises by one per change; old history entries never change.
export function revisionRules(
	bundle: Bundle,
	previous: unknown,
	retiredIds: string[]
): ContentMessage[] {
	const out: ContentMessage[] = [];
	for (const [index, entry] of bundle.contentHistory.entries())
		if (entry.contentRev !== index + 1)
			out.push(
				error(
					"content-history-order",
					`contentHistory entry ${index + 1} has contentRev ${entry.contentRev}`
				)
			);
	const latest = bundle.contentHistory.at(-1)!;
	if (latest.contentRev !== bundle.contentRev || latest.version !== bundle.version)
		out.push(
			error(
				"content-history-latest",
				`contentHistory must end with contentRev ${bundle.contentRev} ${bundle.version}`
			)
		);
	if (!previous || typeof previous !== "object") return out;
	const before = previous as Partial<Bundle> & Record<string, unknown>;
	const retired = new Set(retiredIds);
	const afterIds = recordIds(bundle as unknown as Record<string, unknown>);
	for (const id of recordIds(before))
		if (!afterIds.has(id) && !retired.has(id))
			out.push(
				error(
					"retired-id-missing",
					`${id} is missing from the new bundle; list it in retiredIds if it was retired`
				)
			);
	const history = before.contentHistory ?? [];
	if (JSON.stringify(bundle.contentHistory.slice(0, history.length)) !== JSON.stringify(history))
		out.push(error("content-history-changed", "contentHistory changed an existing entry"));
	const rev = before.contentRev ?? 0;
	if (bundle.contentRev < rev)
		out.push(
			error("content-rev-back", `contentRev went back from ${rev} to ${bundle.contentRev}`)
		);
	// ponytail: compares with the file on disk, so a second edit before commit needs another bump or a restored file.
	if (bundle.contentRev === rev && payload(bundle) !== payload(before))
		out.push(
			error(
				"content-rev-not-bumped",
				`content changed but contentRev is still ${rev}; bump it in data/plate-curation.json` +
					" or restore src/data/plates.json from git if this change already bumped it"
			)
		);
	return out;
}
