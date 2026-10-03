import { holderKey } from "../../text";
import { draftSources, type ContentDraft } from "../draft";
import { error, warning, type ContentMessage } from "../messages";

export function specialRules(draft: ContentDraft, today: string): ContentMessage[] {
	const { specials } = draft;
	const out: ContentMessage[] = [];
	const merged = draftSources(draft);
	const sources = new Map(merged.map((source) => [source.id, source]));
	const checkSources = (id: string, ids: string[]) => {
		for (const sourceId of ids) {
			if (!sources.has(sourceId))
				out.push(error("unknown-source", `${id}: unknown source ${sourceId}`));
		}
	};
	const forms = specials.specials.map((entry) => ({
		id: entry.id,
		keys: [entry.holder, ...entry.aliases].map(holderKey)
	}));
	for (const entry of specials.specials) {
		if (entry.series !== "CD")
			out.push(
				error("special-series", `${entry.id}: series must be CD, found ${entry.series}`)
			);
		if (!/^[1-9][0-9]*$/.test(entry.number))
			out.push(
				error(
					"special-number-format",
					`${entry.id}: number ${entry.number} must be digits without a leading zero`
				)
			);
		if (!entry.id.startsWith(`cd-${entry.number}-`))
			out.push(
				error("special-id-number", `${entry.id}: id does not match number ${entry.number}`)
			);
		checkSources(entry.id, entry.sources);
		if (entry.confidence === "high" && !entry.sources.some((id) => sources.get(id)?.checkedAt))
			out.push(
				error(
					"special-unchecked-source",
					`${entry.id}: a high entry needs a source with checkedAt`
				)
			);
		const own = forms.find((form) => form.id === entry.id)!.keys;
		const clashes = forms.filter(
			(form) => form.id !== entry.id && form.keys.some((key) => own.includes(key))
		);
		for (const clash of clashes)
			if (entry.id < clash.id)
				out.push(
					error(
						"special-holder-collision",
						`${entry.id} and ${clash.id} share a holder or alias`
					)
				);
		if (entry.reviewBy < today)
			out.push(warning("review-due", `${entry.id}: reviewBy ${entry.reviewBy} has passed`));
	}
	const high = specials.specials.filter((entry) => entry.confidence === "high");
	const groupBy = (key: (entry: (typeof high)[number]) => string, code: string, what: string) => {
		const groups = new Map<string, string[]>();
		for (const entry of high)
			groups.set(key(entry), [...(groups.get(key(entry)) ?? []), entry.id]);
		for (const [value, ids] of groups)
			if (ids.length > 1)
				out.push(error(code, `high entries share ${what} ${value}: ${ids.join(", ")}`));
	};
	groupBy((entry) => entry.number, "special-number", "number");
	groupBy((entry) => entry.holder, "special-holder", "holder");
	for (const plate of specials.referencePlates) {
		if (!plate.id.startsWith("ref-"))
			out.push(error("reference-id", `${plate.id}: reference ids start with ref-`));
		if (plate.series === "RI" && plate.number !== null)
			out.push(
				error("reference-ri-number", `${plate.id}: the RI entry must not carry a number`)
			);
		checkSources(plate.id, plate.sources);
		if (plate.reviewBy < today)
			out.push(warning("review-due", `${plate.id}: reviewBy ${plate.reviewBy} has passed`));
	}
	const factSources = new Map(draft.funFacts.sources.map((source) => [source.id, source]));
	for (const source of specials.sources) {
		const twin = factSources.get(source.id);
		if (twin && JSON.stringify(twin) !== JSON.stringify(source))
			out.push(
				error(
					"source-conflict",
					`${source.id}: special-codes.json and fun-facts.json hold different data`
				)
			);
	}
	for (const source of merged)
		if (source.type === "media-mengutip-instansi" && !source.originalUrl)
			out.push(
				warning(
					"source-original-url",
					`${source.id}: a media source quoting an agency needs originalUrl`
				)
			);
	return out;
}
