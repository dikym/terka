import type { Bundle } from "@/core/content/schema";
import type { AppState } from "@/core/replay/state";
import { effectiveCard } from "@/core/replay/universe";
import { contentOf } from "@/core/session/context";

export type DataChanges = { from: string; to: string; items: { title: string; note: string }[] };

const UNLEARNED = new Set(["new", "locked"]);

/** What a content update meant for the learner: only codes they were learning are news. */
export function dataChanges(state: AppState, bundle: Bundle, seenRev: number | null): DataChanges {
	const from =
		bundle.contentHistory.find((entry) => entry.contentRev === seenRev)?.version ??
		bundle.contentHistory[0].version;
	const dropped = new Set<string>();
	for (const cardId of state.cards.keys()) {
		const suspension = effectiveCard(state, cardId)?.suspension;
		if (!suspension || suspension.reason === "manual" || suspension.reason === "leech")
			continue;
		if (!UNLEARNED.has(suspension.resume)) dropped.add(contentOf(cardId));
	}
	return {
		from,
		to: bundle.version,
		items: dropped.size
			? [
					{
						title: `${dropped.size} kode dinonaktifkan`,
						note: "Dinonaktifkan, data perlu diverifikasi"
					}
				]
			: [
					{
						title: "Tidak ada perubahan pada kode yang sedang dipelajari.",
						note: "Riwayat belajar tetap utuh."
					}
				]
	};
}
